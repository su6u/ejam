/**
 * left zone: prediction setup inputs + result-refinement filters
 * refine section stays disabled until a prediction exists
 **/

"use client";

import { Search } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PredictorStateReturn } from "../../../hooks/use-predictor-state";

type Exam = { id: "jee-advanced" | "jee-main"; label: string };

const EXAMS: Exam[] = [
  { id: "jee-advanced", label: "JEE Advanced" },
  { id: "jee-main", label: "JEE Main" },
];

const CATEGORIES = [
  { value: "gen", label: "General (OPEN)" },
  { value: "gen-ews", label: "Gen-EWS" },
  { value: "obc-ncl", label: "OBC-NCL" },
  { value: "sc", label: "SC" },
  { value: "st", label: "ST" },
];

const GENDERS = [
  { value: "neutral", label: "Gender-Neutral" },
  { value: "female", label: "Female-only" },
];

const QUOTA_BY_EXAM: Record<
  Exam["id"],
  Array<{ value: string; label: string }>
> = {
  "jee-advanced": [{ value: "ai", label: "All India (AI)" }],
  "jee-main": [
    { value: "os", label: "Other State (OS)" },
    { value: "hs", label: "Home State (HS)" },
    { value: "ai", label: "All India (AI)" },
  ],
};

const INSTITUTE_TYPES = ["IIT", "NIT", "IIIT", "CFI"] as const;
const BANDS = [
  { value: "safe", label: "Safe" },
  { value: "target", label: "Target" },
  { value: "reach", label: "Reach" },
  { value: "long-shot", label: "Long-shot" },
] as const;

interface PredictorPanelProps {
  state: PredictorStateReturn;
  isLoading: boolean;
  hasResults: boolean;
  bandFilter: Set<string>;
  onBandFilterChange: (next: Set<string>) => void;
  onPredict: () => void;
}

export function PredictorPanel({
  state,
  isLoading,
  hasResults,
  bandFilter,
  onBandFilterChange,
  onPredict,
}: PredictorPanelProps) {
  // home state only applies to jee-main HS quota; clear when out of scope
  useEffect(() => {
    if (
      !(state.exam === "jee-main" && state.quota === "hs") &&
      state.homeState
    ) {
      state.setHomeState("");
    }
  }, [state.exam, state.quota, state.homeState, state.setHomeState]);

  const quotaOptions = QUOTA_BY_EXAM[state.exam];
  const effectiveQuota = state.exam === "jee-advanced" ? "ai" : state.quota;
  const showHomeState = state.exam === "jee-main" && effectiveQuota === "hs";

  return (
    <aside className="flex h-full w-full max-w-[320px] min-w-[280px] flex-col border-r border-border bg-background">
      <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Prediction setup
        </h2>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <Field label="Exam">
          <SegmentGrid
            options={EXAMS.map((e) => ({ value: e.id, label: e.label }))}
            value={state.exam}
            onChange={(v) => state.setExam(v as Exam["id"])}
          />
        </Field>

        <Field label="Rank">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={state.rank}
            onChange={(e) => state.setRank(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 4521"
            maxLength={7}
            className="h-9 tabular-nums"
            aria-label="Rank"
          />
        </Field>

        <Field label="Category">
          <SegmentList
            options={CATEGORIES}
            value={state.category}
            onChange={state.setCategory}
          />
        </Field>

        <Field label="Gender">
          <SegmentGrid
            options={GENDERS}
            value={state.gender}
            onChange={state.setGender}
          />
        </Field>

        <Field label="Quota">
          <SegmentList
            options={quotaOptions}
            value={effectiveQuota}
            onChange={state.setQuota}
          />
        </Field>

        {showHomeState ? (
          <Field label="Home state">
            <Input
              type="text"
              value={state.homeState}
              onChange={(e) => state.setHomeState(e.target.value)}
              placeholder="e.g. Karnataka"
              className="h-9"
              aria-label="Home state"
            />
          </Field>
        ) : null}

        <div className="mt-auto p-3">
          <Button
            type="button"
            onClick={onPredict}
            disabled={isLoading || !state.rank}
            className="h-9 w-full"
          >
            {isLoading ? "Predicting…" : "Predict colleges"}
          </Button>
        </div>

        <Separator />

        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Refine results
          </h2>
          <span
            className={cn(
              "text-[10px] text-muted-foreground transition-opacity",
              hasResults ? "opacity-100" : "opacity-40",
            )}
          >
            {hasResults ? "live" : "after predict"}
          </span>
        </div>

        <Field label="Search program">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="text"
              value={state.searchBranch}
              onChange={(e) => state.setSearchBranch(e.target.value)}
              placeholder="Computer Science, Mech..."
              disabled={!hasResults}
              className="h-9 pl-8"
              aria-label="Search program"
            />
          </div>
        </Field>

        <Field label="Probability band">
          <ChipGrid
            options={BANDS.map((b) => ({ value: b.value, label: b.label }))}
            values={bandFilter}
            disabled={!hasResults}
            onToggle={(value) => {
              const next = new Set(bandFilter);
              if (next.has(value)) next.delete(value);
              else next.add(value);
              onBandFilterChange(next);
            }}
          />
        </Field>

        <Field label="Institute type">
          <ChipGrid
            options={INSTITUTE_TYPES.map((t) => ({ value: t, label: t }))}
            values={state.instituteTypeFilter}
            disabled={!hasResults}
            onToggle={state.toggleInstituteType}
          />
        </Field>

        <Field label="Hide long-shot">
          <Toggle
            value={state.hideLongShot}
            disabled={!hasResults}
            onChange={state.setHideLongShot}
            label={state.hideLongShot ? "Hidden" : "Shown"}
          />
        </Field>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border px-4 py-3">
      <Label className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SegmentGrid({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={cn(
              "flex h-8 items-center justify-center rounded-md border text-[12px] font-medium outline-none transition-colors",
              "border-border bg-card text-muted-foreground",
              "hover:border-ring/40 hover:text-foreground",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              isActive && "border-foreground/30 bg-accent text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SegmentList({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={cn(
              "flex h-8 items-center justify-between rounded-md border px-2.5 text-[12px] outline-none transition-colors",
              "border-border bg-card text-muted-foreground",
              "hover:border-ring/40 hover:text-foreground",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              isActive &&
                "border-foreground/30 bg-accent font-medium text-foreground",
            )}
          >
            <span>{opt.label}</span>
            {isActive ? (
              <span className="size-1.5 rounded-full bg-foreground/80" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ChipGrid({
  options,
  values,
  disabled,
  onToggle,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  values: Set<string>;
  disabled?: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = values.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt.value)}
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium outline-none transition-colors",
              "border-border bg-card text-muted-foreground",
              "hover:border-ring/40 hover:text-foreground",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              "disabled:pointer-events-none disabled:opacity-50",
              isActive && "border-foreground/30 bg-accent text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  value,
  disabled,
  onChange,
  label,
}: {
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className={cn(
        "flex h-8 items-center justify-between rounded-md border px-2.5 text-[12px] outline-none transition-colors",
        "border-border bg-card text-muted-foreground",
        "hover:border-ring/40 hover:text-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
        "disabled:pointer-events-none disabled:opacity-50",
        value && "border-foreground/30 bg-accent text-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative inline-flex h-3.5 w-6 items-center rounded-full border transition-colors",
          value
            ? "border-foreground/40 bg-foreground/70"
            : "border-border bg-card",
        )}
      >
        <span
          className={cn(
            "absolute size-2.5 rounded-full bg-background transition-transform",
            value ? "translate-x-2.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
