"use client";

import type { PredictionProvenance } from "@ejam/data";
import { CircleAlert } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { LoadingAnimation } from "@/components/loading-animation";
import { DataVersionFooter } from "@/components/predictor/data-version-footer";
import { ResultsCardShell } from "@/components/predictor/results-card-shell";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

function EmptyIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <EmptyMedia className="mb-0 w-full max-w-72">
      <video
        autoPlay={!shouldReduceMotion}
        loop={!shouldReduceMotion}
        muted
        playsInline
        aria-hidden
        className="h-auto w-full object-contain"
      >
        <source src="/assets/eye.webm" type="video/webm" />
      </video>
    </EmptyMedia>
  );
}

function emptyDescription({
  hasRank,
  hasPredicted,
}: {
  hasRank: boolean;
  hasPredicted: boolean;
}): string {
  if (hasPredicted) {
    return "No colleges at reach or better for this rank — try a lower rank or use include-all";
  }
  if (hasRank) {
    return "Hit Predict on the left to see the colleges and programs ranked by chance, strongest options first within each band.";
  }
  return "Enter your rank and pick a category on the left, then run a prediction to see colleges ranked by your admission chance.";
}

export function EmptyState({
  hasRank,
  hasPredicted = false,
  provenance,
}: {
  hasRank: boolean;
  hasPredicted?: boolean;
  provenance?: PredictionProvenance | null;
}) {
  return (
    <ResultsCardShell footer={<DataVersionFooter provenance={provenance} />}>
      <Empty>
        <EmptyHeader>
          <EmptyIllustration />
          <EmptyDescription>
            {emptyDescription({ hasRank, hasPredicted })}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    </ResultsCardShell>
  );
}

export function ErrorState({
  message,
  provenance,
}: {
  message: string;
  provenance?: PredictionProvenance | null;
}) {
  return (
    <ResultsCardShell footer={<DataVersionFooter provenance={provenance} />}>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlert aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Prediction failed</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    </ResultsCardShell>
  );
}

export function LoadingState({
  provenance,
}: {
  provenance?: PredictionProvenance | null;
}) {
  return (
    <ResultsCardShell footer={<DataVersionFooter provenance={provenance} />}>
      <Empty>
        <EmptyHeader>
          <EmptyMedia className="mb-0 bg-transparent">
            <LoadingAnimation className="size-8" />
          </EmptyMedia>
          <EmptyTitle>Generating predictions…</EmptyTitle>
          <EmptyDescription>
            Crunching cutoffs against your inputs.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </ResultsCardShell>
  );
}
