"use client";

import Image from "next/image";
import { type ReactNode, Suspense } from "react";
import { sidebarPanelTopInsetClass, predictorHeaderStripClass } from "@/components/app-layout";
import { HomeStateCombobox } from "@/components/predictor/home-state-combobox";
import { usePredictor } from "@/components/predictor/predictor-context";
import { ProximityPicker } from "@/components/predictor/proximity-picker";
import { RankInput } from "@/components/predictor/rank-input";
import { SidebarFilterSection } from "@/components/predictor/sidebar-filter-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { quotaRequiresHomeState } from "@ejam/predictors/shared/quota-input";
import type { CounsellingBody, ExamType } from "@/hooks/use-predictor-state";
import { isJeeMainCounselling } from "@/hooks/use-predictor-state";
import { deferAfterPress, pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

/** border-only triggers — dropdown panels keep popover surface */
const sidebarControlClass =
  "bg-transparent shadow-none dark:bg-transparent dark:hover:bg-transparent";

const EXAM_OPTIONS: Array<{
  id: ExamType;
  label: string;
  logo: string;
}> = [
  {
    id: "jee-main",
    label: "JEE Main",
    logo: "/exams/jee_main.svg",
  },
  {
    id: "jee-advanced",
    label: "JEE Advanced",
    logo: "/exams/jee_adv.svg",
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

const COUNSELLING_OPTIONS = [
  { value: "josaa", label: "JoSAA" },
  { value: "csab", label: "CSAB" },
];

export function PredictorSidebarPanel() {
  return (
    <Suspense fallback={null}>
      <PredictorSidebarPanelInner />
    </Suspense>
  );
}

function PredictorSidebarPanelInner() {
  const {
    state,
    query,
    onPredict,
    rankInputRef,
    filters,
    setFilters,
    hasResults,
  } = usePredictor();

  const programs = query.data?.programs ?? [];

  const showQuota = isJeeMainCounselling(state.exam);
  const needsHomeState = showQuota && quotaRequiresHomeState(state.quota);
  const canPredict =
    Boolean(state.rank) && !(needsHomeState && !state.homeState.trim());
  const hasPredictedForInputs = query.data !== null;

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col">
        <div
          className={cn(
            "grid grid-cols-2 gap-2 px-2 pb-2",
            sidebarPanelTopInsetClass,
          )}
        >
          {EXAM_OPTIONS.map((exam) => {
            const isActive = state.exam === exam.id;

            return (
              <Tooltip key={exam.id}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={exam.label}
                      aria-pressed={isActive}
                      onClick={() => {
                        deferAfterPress(() => state.setExam(exam.id));
                      }}
                      className={cn(
                        "flex w-full items-center justify-center rounded-none border bg-transparent outline-none",
                        predictorHeaderStripClass,
                        pressableClass,
                        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        isActive && "border-foreground/40",
                        !isActive &&
                          "group/exam border-border/70 hover:border-border",
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
                      !isActive &&
                        "opacity-55 group-hover/exam:opacity-80",
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
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-2 py-3">
          <SetupField label="Rank" required>
            <RankInput
              ref={rankInputRef}
              value={state.rank}
              onValueChange={state.setRank}
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

          {needsHomeState ? (
            <SetupField
              label="Home state"
              required
              hint="required for OS and HS seat pools"
            >
              <HomeStateCombobox
                value={state.homeState}
                onValueChange={state.setHomeState}
              />
            </SetupField>
          ) : null}

          {showQuota ? (
            <SetupField label="Counselling" required>
              <OptionToggle
                value={state.counselling}
                onChange={(value) =>
                  state.setCounselling(value as CounsellingBody)
                }
                options={COUNSELLING_OPTIONS}
                columns={2}
              />
            </SetupField>
          ) : null}

          <Button
            type="button"
            onClick={() => deferAfterPress(onPredict)}
            disabled={query.isLoading || !canPredict || hasPredictedForInputs}
            className="mt-1 w-full rounded-none"
          >
            {query.isLoading ? "Predicting…" : "Predict colleges"}
          </Button>
        </div>

        {hasResults ? (
          <SidebarFilterSection
            exam={state.exam}
            programs={programs}
            filters={filters}
            onChange={setFilters}
          />
        ) : null}
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
  options: ReadonlyArray<{
    value: string;
    label: string;
    enabled?: boolean;
  }>;
  columns: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-1",
        columns === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const isEnabled = option.enabled !== false;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            disabled={!isEnabled}
            onClick={() => {
              if (isEnabled) deferAfterPress(() => onChange(option.value));
            }}
            className={cn(
              "flex h-8 items-center justify-center rounded-none border border-border bg-transparent text-xs font-medium text-muted-foreground outline-none",
              pressableClass,
              isEnabled && "hover:text-foreground",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive && "border-foreground/40 text-foreground",
              !isEnabled &&
                "cursor-not-allowed border-border/70 opacity-40 grayscale",
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
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
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
      {hint ? (
        <p className="text-[10px] leading-snug text-muted-foreground/50">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
