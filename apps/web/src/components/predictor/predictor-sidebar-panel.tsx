"use client";

import { quotaRequiresHomeState } from "@ejam/predictors/shared/quota-input";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  Suspense,
  useId,
} from "react";
import { sidebarPanelTopInsetClass } from "@/components/app-layout";
import { HomeStateCombobox } from "@/components/predictor/home-state-combobox";
import { OptionPicker } from "@/components/predictor/option-picker";
import { PredictButtonLabel } from "@/components/predictor/predict-button-label";
import { usePredictor } from "@/components/predictor/predictor-context";
import { RankInput } from "@/components/predictor/rank-input";
import { SidebarFilterSection } from "@/components/predictor/sidebar-filter-section";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CounsellingBody, ExamType } from "@/hooks/use-predictor-state";
import { isJeeMainCounselling } from "@/hooks/use-predictor-state";
import { deferAfterPress, pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

/** border-only triggers — dropdown panels keep popover surface */
const sidebarControlClass =
  "transition-colors duration-200 ease-out bg-transparent shadow-none hover:bg-muted dark:bg-transparent dark:hover:bg-muted/50";

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
  const { isMobile, setOpenMobile } = useSidebar();

  const programs = query.data?.programs ?? [];

  const showQuota = isJeeMainCounselling(state.exam);
  const needsHomeState = showQuota && quotaRequiresHomeState(state.quota);
  const canPredict =
    Boolean(state.rank) && !(needsHomeState && !state.homeState.trim());
  const hasPredictedForInputs = query.data !== null;
  const predictDisabled =
    query.isLoading || !canPredict || hasPredictedForInputs;
  const predictDisabledReason = query.isLoading
    ? undefined
    : !state.rank.trim()
      ? "Enter your counselling rank"
      : needsHomeState && !state.homeState.trim()
        ? "Select your home state for OS or HS quota"
        : hasPredictedForInputs
          ? "Change rank or profile to predict again"
          : undefined;
  const examActiveIndex = EXAM_OPTIONS.findIndex((e) => e.id === state.exam);

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col">
        <div className={cn("px-2 pb-2", sidebarPanelTopInsetClass)}>
          {/* segmented control — one indicator slides between the exam tiles */}
          <div className="exam-picker-grid sliding-toggle-track" data-gap="2">
            <span
              aria-hidden
              className="sliding-toggle-indicator"
              data-cols="2"
              data-gap="2"
              data-index={examActiveIndex <= 0 ? "0" : "1"}
            />
            <div className="sliding-toggle-grid grid grid-cols-2">
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
                            "exam-picker-tile rounded-none border-0 outline-none shadow-none",
                            pressableClass,
                            "focus-visible:ring-3 focus-visible:ring-ring/50",
                          )}
                        >
                          {/* native img — avoids Next/Image SVG raster edge artifacts */}
                          {/* biome-ignore lint/performance/noImgElement: SVG exam logos rasterize poorly via next/image */}
                          <img
                            src={exam.logo}
                            alt=""
                            width={36}
                            height={36}
                            aria-hidden
                            decoding="async"
                            className="exam-picker-logo size-9 shrink-0 object-contain transition-[opacity,filter] duration-150"
                          />
                        </button>
                      }
                    />
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
          </div>
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
              <OptionPicker
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
              label={state.quota === "hs" ? "Home state" : "Other state"}
              required
              hint={
                state.quota === "hs"
                  ? "required for HS seat pool"
                  : "required for OS seat pool"
              }
            >
              <HomeStateCombobox
                value={state.homeState}
                onValueChange={state.setHomeState}
                placeholder={
                  state.quota === "hs"
                    ? "Select home state"
                    : "Select other state"
                }
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
            onClick={() =>
              deferAfterPress(() => {
                void onPredict();
                if (isMobile) setOpenMobile(false);
              })
            }
            disabled={predictDisabled}
            title={predictDisabledReason}
            aria-describedby={
              predictDisabledReason ? "predict-hint" : undefined
            }
            className="mt-1 w-full overflow-visible rounded-none"
          >
            <PredictButtonLabel loading={query.isLoading} />
          </Button>
          {predictDisabledReason ? (
            <p id="predict-hint" className="sr-only">
              {predictDisabledReason}
            </p>
          ) : null}
        </div>

        {hasResults ? (
          <SidebarFilterSection
            exam={state.exam}
            programs={programs}
            filters={filters}
            onChange={setFilters}
            includeAll={state.include_all}
            onToggleLongShots={() => {
              const next = !state.include_all;
              state.setIncludeAll(next);
            }}
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
  "aria-labelledby": ariaLabelledBy,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{
    value: string;
    label: string;
    enabled?: boolean;
  }>;
  columns: 2 | 3;
  "aria-labelledby"?: string;
}) {
  const activeIndex = options.findIndex((option) => option.value === value);

  return (
    <fieldset aria-labelledby={ariaLabelledBy} className="min-w-0 border-0 p-0">
      <div className="sliding-toggle-track" data-gap="1">
        {activeIndex >= 0 ? (
          <span
            aria-hidden
            className="sliding-toggle-indicator"
            data-cols={String(columns)}
            data-gap="1"
            data-index={String(activeIndex)}
          />
        ) : null}
        <div
          className={cn(
            "sliding-toggle-grid grid",
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
                  "sliding-toggle-tile flex h-8 items-center justify-center rounded-none text-xs font-medium text-muted-foreground outline-none",
                  pressableClass,
                  isEnabled && "hover:text-foreground",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive && "text-foreground",
                  !isEnabled && "cursor-not-allowed opacity-40 grayscale",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}

function SetupField({
  label,
  required,
  hint,
  children,
  fieldId,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  fieldId?: string;
}) {
  const generatedId = useId();
  const controlId = fieldId ?? generatedId;
  const labelId = `${controlId}-label`;
  const usesGroupLabel =
    isValidElement(children) && children.type === OptionToggle;
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{ id?: string; "aria-labelledby"?: string }>,
        usesGroupLabel
          ? { "aria-labelledby": labelId }
          : {
              id:
                (children as ReactElement<{ id?: string }>).props.id ??
                controlId,
            },
      )
    : children;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        id={labelId}
        htmlFor={usesGroupLabel ? undefined : controlId}
        className="flex items-center gap-2 text-xs leading-none font-medium text-muted-foreground select-none"
      >
        {label}
        {required ? (
          <span className="text-muted-foreground/70" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint ? (
        <p className="text-xs leading-snug text-muted-foreground/70">{hint}</p>
      ) : null}
    </div>
  );
}
