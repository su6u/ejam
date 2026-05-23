"use client";

import Image from "next/image";
import { Suspense, useEffect, type ReactNode } from "react";
import { usePredictor } from "@/components/predictor/predictor-context";
import { HomeStateCombobox } from "@/components/predictor/home-state-combobox";
import { ProximityPicker } from "@/components/predictor/proximity-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type ExamType } from "@/hooks/use-predictor-state";
import { cn } from "@/lib/utils";

/** border-only triggers — dropdown panels keep popover surface */
const sidebarControlClass =
  "bg-transparent shadow-none dark:bg-transparent dark:hover:bg-transparent";

type ExamPickerId = ExamType | "bitsat" | "met";

const EXAM_OPTIONS: Array<{
  id: ExamPickerId;
  label: string;
  logo: string;
  enabled: boolean;
}> = [
  {
    id: "jee-main",
    label: "JEE Main",
    logo: "/assets/exam/jee_main.svg",
    enabled: true,
  },
  {
    id: "jee-advanced",
    label: "JEE Advanced",
    logo: "/assets/exam/jee_adv.svg",
    enabled: true,
  },
  {
    id: "bitsat",
    label: "BITSAT",
    logo: "/assets/exam/bitsat.svg",
    enabled: false,
  },
  {
    id: "met",
    label: "MET",
    logo: "/assets/exam/met.svg",
    enabled: false,
  },
];

const CATEGORIES = [
  { value: "gen", label: "General" },
  { value: "gen-ews", label: "Gen-EWS" },
  { value: "obc-ncl", label: "OBC-NCL" },
  { value: "sc", label: "SC" },
  { value: "st", label: "ST" },
];

const GENDERS = [
  { value: "neutral", label: "Neutral" },
  { value: "female", label: "Female" },
];

const QUOTA_OPTIONS = [
  { value: "os", label: "OS" },
  { value: "hs", label: "HS" },
  { value: "ai", label: "AI" },
];

export function PredictorSidebarPanel() {
  return (
    <Suspense fallback={null}>
      <PredictorSidebarPanelInner />
    </Suspense>
  );
}

function PredictorSidebarPanelInner() {
  const { state, query, onPredict } = usePredictor();

  useEffect(() => {
    if (
      !(state.exam === "jee-main" && state.quota === "hs") &&
      state.homeState
    ) {
      state.setHomeState("");
    }
  }, [state.exam, state.quota, state.homeState, state.setHomeState]);

  const showQuota = state.exam === "jee-main";
  const showHomeState = state.exam === "jee-main" && state.quota === "hs";
  const canPredict =
    Boolean(state.rank) &&
    !(showHomeState && !state.homeState.trim());

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col">
        <div className="grid grid-cols-2 gap-2 p-2">
          {EXAM_OPTIONS.map((exam) => {
            const isActive = exam.enabled && state.exam === exam.id;

            return (
              <Tooltip key={exam.id}>
                <TooltipTrigger
                  disabled={!exam.enabled}
                  render={
                    <button
                      type="button"
                      aria-label={exam.label}
                      aria-pressed={isActive}
                      disabled={!exam.enabled}
                      onClick={() => {
                        if (exam.enabled) {
                          state.setExam(exam.id as ExamType);
                        }
                      }}
                      className={cn(
                        "flex h-12 w-full items-center justify-center rounded-none border bg-transparent transition-colors outline-none",
                        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        isActive && "border-foreground/40",
                        exam.enabled &&
                          !isActive &&
                          "group/exam border-border/70 hover:border-border",
                        !exam.enabled &&
                          "cursor-not-allowed border-border opacity-40 grayscale",
                      )}
                    />
                  }
                >
                  <Image
                    src={exam.logo}
                    alt=""
                    width={36}
                    height={36}
                    aria-hidden
                    className={cn(
                      "size-9 shrink-0 object-contain transition-opacity",
                      exam.enabled && !isActive && "opacity-55 group-hover/exam:opacity-80",
                      isActive && "opacity-100",
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  align="center"
                  className="rounded-none"
                >
                  {exam.label}
                  {!exam.enabled ? " (coming soon)" : null}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-2 py-3">
          <SetupField label="Rank" required>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={state.rank}
              onChange={(e) =>
                state.setRank(e.target.value.replace(/\D/g, ""))
              }
              placeholder="e.g. 4521"
              maxLength={7}
              required
              aria-required
              className={cn(
                "w-full rounded-none tabular-nums",
                sidebarControlClass,
              )}
            />
          </SetupField>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-2">
            <SetupField label="Category" required>
              <ProximityPicker
                value={state.category}
                onValueChange={state.setCategory}
                options={CATEGORIES}
                placeholder="Category"
                triggerClassName={sidebarControlClass}
              />
            </SetupField>

            <SetupField label="Gender" required>
              <OptionToggle
                value={state.gender}
                onChange={state.setGender}
                options={GENDERS}
                columns={2}
              />
            </SetupField>
          </div>

          {showQuota ? (
            <SetupField label="Quota" required>
              <OptionToggle
                value={state.quota}
                onChange={state.setQuota}
                options={QUOTA_OPTIONS}
                columns={3}
              />
            </SetupField>
          ) : null}

          {showHomeState ? (
            <SetupField label="Home state" required>
              <HomeStateCombobox
                value={state.homeState}
                onValueChange={state.setHomeState}
              />
            </SetupField>
          ) : null}

          <Button
            type="button"
            onClick={onPredict}
            disabled={query.isLoading || !canPredict}
            className="mt-1 w-full rounded-none"
          >
            {query.isLoading ? "Predicting…" : "Predict colleges"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

function OptionToggle({
  value,
  onChange,
  options,
  columns,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  columns: 2 | 3;
}) {
  return (
    <div
      className={cn("grid gap-1", columns === 2 ? "grid-cols-2" : "grid-cols-3")}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-8 items-center justify-center rounded-none border border-border bg-transparent text-xs font-medium text-muted-foreground transition-colors outline-none",
              "hover:text-foreground",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive && "border-foreground/40 text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SetupField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required ? (
          <span className="text-muted-foreground/70" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}
