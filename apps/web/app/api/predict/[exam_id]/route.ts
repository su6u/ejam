/**
 * GET/POST /api/predict/{exam_id}
 * generic prediction endpoint — config lookup, input validation, exam dispatch, standard response
 * exam-specific predictors plug in via the registry; this handler never imports exam internals
 */

import type {
  PredictionErrorResponse,
  PredictionSuccessResponse,
} from "@ejam/data";
import { decodeCollegePredictorUrlParams } from "@ejam/data/college-predictor";
import {
  loadLatestManifest,
  resolveExamDependencies,
} from "@ejam/data/dependency-resolver";
import { loadExamConfig } from "@ejam/data/exam-config";
import { type NextRequest, NextResponse } from "next/server";
import { getPredictor } from "../registry";

type RouteParams = { params: Promise<{ exam_id: string }> };

function errResponse(
  status: number,
  code: PredictionErrorResponse["error"]["code"],
  message: string,
  fieldErrors?: Record<string, string>,
): NextResponse<PredictionErrorResponse> {
  const body: PredictionErrorResponse = {
    ok: false,
    error: {
      code,
      message,
      ...(fieldErrors ? { field_errors: fieldErrors } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

function loadConfiguredExam(
  examId: string,
):
  | { ok: true; examConfig: Awaited<ReturnType<typeof loadExamConfig>> }
  | { ok: false; response: NextResponse<PredictionErrorResponse> } {
  try {
    return { ok: true, examConfig: loadExamConfig(examId) };
  } catch {
    return {
      ok: false,
      response: errResponse(
        404,
        "EXAM_NOT_FOUND",
        `exam "${examId}" is not configured`,
      ),
    };
  }
}

async function readPostBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function readInput(
  req: NextRequest,
  method: "GET" | "POST",
): Promise<unknown> {
  const url = new URL(req.url);
  const queryInput = url.searchParams.has("rank")
    ? decodeCollegePredictorUrlParams(url.searchParams)
    : null;

  if (method === "GET") return queryInput;

  const rawBody = await readPostBody(req);
  if (rawBody && typeof rawBody === "object") {
    return {
      ...rawBody,
      ...(url.searchParams.get("include_all") === "true"
        ? { include_all: true }
        : {}),
    };
  }

  return queryInput;
}

function resolveDatasets(
  examId: string,
  examConfig: Awaited<ReturnType<typeof loadExamConfig>>,
  url: URL,
):
  | {
      ok: true;
      manifestVersion: string;
      resolvedDatasets: Array<{
        dataset: string;
        path: string;
        sha256: string;
      }>;
    }
  | { ok: false; response: NextResponse<PredictionErrorResponse> } {
  const manifest = loadLatestManifest();
  const yearParam = url.searchParams.get("year");
  const year = yearParam
    ? Number.parseInt(yearParam, 10)
    : new Date().getFullYear();
  const resolution = resolveExamDependencies({
    examId,
    dependencies: examConfig.data_dependencies,
    manifest,
    year,
  });
  if (!resolution.publishable) {
    const missing = resolution.missing
      .filter((m) => m.required)
      .map((m) => m.dataset);
    return {
      ok: false,
      response: errResponse(
        503,
        "DEPENDENCY_UNAVAILABLE",
        `required datasets unavailable for "${examId}": ${missing.join(", ")}`,
      ),
    };
  }

  return {
    ok: true,
    manifestVersion: manifest.version,
    resolvedDatasets: resolution.resolved.map((r) => ({
      dataset: r.dataset,
      path: r.path,
      sha256: r.sha256,
    })),
  };
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}

function buildFieldErrors(
  issues: Array<{ path: Array<string | number>; message: string }>,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.length ? issue.path.join(".") : "<root>";
    fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

function validateInput(
  input: unknown,
  inputSchema: {
    safeParse: (data: unknown) => {
      success: boolean;
      data?: unknown;
      error?: {
        issues: Array<{ path: Array<string | number>; message: string }>;
      };
    };
  },
):
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse<PredictionErrorResponse> } {
  const inputResult = inputSchema.safeParse(input);
  if (inputResult.success) {
    return { ok: true, data: inputResult.data };
  }
  if (!inputResult.error) {
    return {
      ok: false,
      response: errResponse(
        400,
        "INVALID_INPUT",
        "request body failed schema validation",
      ),
    };
  }
  const fieldErrors = buildFieldErrors(inputResult.error.issues);
  return {
    ok: false,
    response: errResponse(
      400,
      "INVALID_INPUT",
      "request body failed schema validation",
      fieldErrors,
    ),
  };
}

async function handlePrediction(
  req: NextRequest,
  { params }: RouteParams,
  method: "GET" | "POST",
): Promise<NextResponse<PredictionSuccessResponse | PredictionErrorResponse>> {
  const { exam_id } = await params;
  const url = new URL(req.url);
  const configured = loadConfiguredExam(exam_id);
  if (!configured.ok) return configured.response;

  const predictor = await getPredictor(exam_id);
  if (!predictor) {
    return errResponse(
      501,
      "PREDICTOR_NOT_REGISTERED",
      `predictor for "${exam_id}" is not yet implemented`,
    );
  }

  const input = await readInput(req, method);
  if (!input) {
    const message =
      method === "GET"
        ? "query params must include a valid rank"
        : "request body must be valid JSON or query params must include rank";
    return errResponse(400, "INVALID_INPUT", message);
  }

  const validationResult = validateInput(input, predictor.inputSchema);
  if (!validationResult.ok) return validationResult.response;

  let dependencyResult: ReturnType<typeof resolveDatasets>;
  try {
    dependencyResult = resolveDatasets(exam_id, configured.examConfig, url);
  } catch (err) {
    const msg = getErrorMessage(err);
    return errResponse(
      500,
      "INTERNAL_ERROR",
      `dependency resolution failed: ${msg}`,
    );
  }
  if (!dependencyResult.ok) return dependencyResult.response;

  try {
    const { result, confidence } = await predictor.predict(
      validationResult.data,
      {
        resolvedDatasets: dependencyResult.resolvedDatasets,
        examId: exam_id,
      },
    );

    const body: PredictionSuccessResponse = {
      ok: true,
      exam_id,
      result,
      ...(confidence ? { confidence } : {}),
      provenance: {
        exam_id,
        manifest_version: dependencyResult.manifestVersion,
        datasets_used: dependencyResult.resolvedDatasets,
        generated_at: new Date().toISOString(),
      },
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    const msg = getErrorMessage(err);
    return errResponse(500, "INTERNAL_ERROR", msg);
  }
}

export async function POST(
  req: NextRequest,
  params: RouteParams,
): Promise<NextResponse<PredictionSuccessResponse | PredictionErrorResponse>> {
  return handlePrediction(req, params, "POST");
}

export async function GET(
  req: NextRequest,
  params: RouteParams,
): Promise<NextResponse<PredictionSuccessResponse | PredictionErrorResponse>> {
  return handlePrediction(req, params, "GET");
}
