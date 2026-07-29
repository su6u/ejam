/**
 * right-side drawer for a single prediction
 * shows data quality and the per-round trajectory the table omits
 **/

"use client";

import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DashboardCard } from "@/components/dashboard-card";
import {
  ActiveDot,
  Area,
  Grid as AreaGrid,
  Tooltip as AreaTooltip,
  XAxis as AreaXAxis,
  YAxis as AreaYAxis,
  Dot,
  EvilAreaChart,
} from "@/components/evilcharts/charts/area-chart";
import {
  Bar,
  Grid as BarGrid,
  Tooltip as BarTooltip,
  XAxis as BarXAxis,
  YAxis as BarYAxis,
  EvilBarChart,
} from "@/components/evilcharts/charts/bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/chart-types";
import { formatInteger } from "@/components/formatter";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PredictorDisplayProgram } from "@/lib/predictor-adapters";
import { cn } from "@/lib/utils";
import { BandBadge } from "./band-badge";
import { InstituteTypeBadge } from "./institute-type-badge";
import {
  getMhtCetStageBadgeLabel,
  getMhtCetStageBadgeShortLabel,
} from "./mht-cet/stage-badge";

interface CollegeDetailSheetProps {
  program: PredictorDisplayProgram | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollegeDetailSheet({
  program,
  open,
  onOpenChange,
}: CollegeDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full bg-background p-0 text-foreground sm:max-w-xl"
      >
        {program ? <DetailBody key={program.key} program={program} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({ program }: { program: PredictorDisplayProgram }) {
  const bestRoundDetail =
    program.bestRound === undefined
      ? null
      : (program.roundDetails?.[program.bestRound - 1] ?? null);
  const bestConversionLabel = bestRoundDetail
    ? getMhtCetStageBadgeShortLabel(bestRoundDetail.stageSemanticsId)
    : null;
  const bestConversionTitle = bestRoundDetail
    ? getMhtCetStageBadgeLabel(bestRoundDetail.stageSemanticsId)
    : null;
  return (
    <div className="sheet-body">
      <SheetHeader className="border-b border-border p-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <InstituteTypeBadge type={program.instituteType} />
            <BandBadge band={program.band} />
            {bestConversionLabel ? (
              <ConversionBadge
                label={bestConversionLabel}
                title={bestConversionTitle ?? undefined}
              />
            ) : null}
          </div>
          <SheetClose
            render={
              <Button
                variant="ghost"
                className="sheet-close-hit shrink-0 rounded-none"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
        <SheetTitle className="mt-1.5 text-balance leading-tight">
          {program.instituteName}
        </SheetTitle>
        <SheetDescription className="text-pretty leading-relaxed">
          {program.programName}
          {program.degree ? (
            <span className="ml-1.5 text-[11px] tracking-[0.05em] text-muted-foreground/80 uppercase tabular-nums">
              {program.degree} · {program.durationYears}y
            </span>
          ) : null}
        </SheetDescription>
      </SheetHeader>

      <section className="grid grid-cols-2 gap-px border-b border-border bg-border">
        <ProgramMetricCard
          label="Chance"
          value={formatProbability(program.overallProbability)}
          caption="At your rank"
        />
        <ProgramMetricCard
          label="Predicted closing"
          value={formatInteger(program.predictedClosingRank)}
          caption="Estimated rank"
        />
        {program.exam === "jee" ? (
          <>
            <ProgramMetricCard
              label="Weighted mean"
              value={formatInteger(program.weightedMean ?? 0)}
              caption="Historical center"
            />
            <ProgramMetricCard
              label="Sigma"
              value={formatInteger(program.sigmaEffective ?? 0)}
              caption="Model spread"
            />
          </>
        ) : (
          <>
            <ProgramMetricCard
              label="Latest percentile"
              value={
                program.latestHistoricalPercentile === null ||
                program.latestHistoricalPercentile === undefined
                  ? "Unavailable"
                  : program.latestHistoricalPercentile.toFixed(5)
              }
              caption="Historical record"
            />
            <ProgramMetricCard
              label="Choice code"
              value={program.choiceCode ?? "Unavailable"}
              caption="Official offering"
            />
          </>
        )}
      </section>

      <RoundProbabilityChart program={program} />

      <section className="border-b border-border p-4">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Seat pool
        </h3>
        {program.jeeProgram ? (
          <dl className="mt-2 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-[12px]">
            <DetailTerm>Matched pool</DetailTerm>
            <DetailValue>{program.seatPoolLabel}</DetailValue>
            <DetailTerm>Quota</DetailTerm>
            <DetailValue>{program.jeeProgram.quota.toUpperCase()}</DetailValue>
            <DetailTerm>Gender</DetailTerm>
            <DetailValue>
              {program.gender ?? program.jeeProgram.gender}
            </DetailValue>
            {program.homeState ? (
              <>
                <DetailTerm>Home state</DetailTerm>
                <DetailValue>{program.homeState}</DetailValue>
              </>
            ) : null}
            {program.fillRound ? (
              <>
                <DetailTerm>Final fill round</DetailTerm>
                <DetailValue className="tabular-nums">
                  {program.fillRound}
                </DetailValue>
              </>
            ) : null}
          </dl>
        ) : (
          <MhtSeatPoolDetails
            matchedPool={program.seatPoolLabel}
            bestRoundDetail={bestRoundDetail}
          />
        )}
        {program.seatPoolsConsidered ? (
          <MhtSeatPoolsConsidered
            matchedPool={program.seatPoolLabel}
            pools={program.seatPoolsConsidered}
          />
        ) : null}
      </section>

      <section className="border-b border-border p-4">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Data quality
        </h3>
        <dl className="mt-2 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-[12px]">
          <DetailTerm>Signal</DetailTerm>
          <DetailValue className="capitalize">
            {program.dataQuality}
          </DetailValue>
          <DetailTerm>Years of data</DetailTerm>
          <DetailValue className="tabular-nums">
            {program.yearsOfData}
          </DetailValue>
          <DetailTerm>Most recent</DetailTerm>
          <DetailValue className="tabular-nums">
            {program.latestYear}
          </DetailValue>
          <DetailTerm>Supported rounds</DetailTerm>
          <DetailValue className="tabular-nums">
            {program.roundCount}
          </DetailValue>
        </dl>
      </section>

      <section className="p-4 pt-3 text-[11px] leading-relaxed text-pretty text-muted-foreground">
        {program.exam === "mht-cet"
          ? "MHT-CET probabilities use limited 2024–2025 history and independently calibrated empirical uncertainty. Seat counts are not treated as probability."
          : "Predictions are estimated from historical cutoffs and trend slope: actual round cutoffs can drift with seat-matrix changes, demand shifts, and counselling rule updates each year."}
      </section>
    </div>
  );
}

function ProgramMetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <DashboardCard className="gap-2 border-0 bg-background px-4 py-3" size="sm">
      <CardHeader className="px-0">
        <CardTitle className="min-h-[2lh] text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto px-0">
        <div className="text-lg font-semibold tabular-nums text-foreground">
          {value}
        </div>
        <CardDescription className="mt-0.5 text-[11px]">
          {caption}
        </CardDescription>
      </CardContent>
    </DashboardCard>
  );
}

const roundChartConfig = {
  chance: {
    label: "Chance",
    colors: {
      light: ["#525252"],
      dark: ["#d4d4d4"],
    },
  },
  unavailable: {
    label: "No data",
    colors: {
      light: ["#a3a3a3"],
      dark: ["#525252"],
    },
  },
} satisfies ChartConfig;

function RoundProbabilityChart({
  program,
}: {
  program: PredictorDisplayProgram;
}) {
  const isMhtCet = program.exam === "mht-cet";
  const rows = program.roundProbabilities.map((value, index) => {
    const chance =
      value === null ? null : Math.round(Math.min(1, Math.max(0, value)) * 100);
    return {
      round: `R${index + 1}`,
      chance,
      // Full-height gray slot so missing rounds don't break the chart rhythm
      unavailable: chance === null ? 100 : null,
    };
  });

  return (
    <section className="border-b border-border p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Round-by-round probability
        </h3>
        <p className="text-[11px] text-pretty text-muted-foreground/80">
          Chance the closing rank reaches yours each round. Unavailable rounds
          keep the source-backed reason.
        </p>
      </div>
      {isMhtCet ? (
        <EvilBarChart
          className="mt-3 aspect-auto h-36 w-full"
          config={roundChartConfig}
          data={rows}
          barRadius={0}
          chartProps={{
            margin: { left: 8, right: 8, top: 12, bottom: 0 },
            barCategoryGap: "28%",
          }}
        >
          <BarGrid />
          <BarXAxis dataKey="round" interval={0} />
          <BarYAxis domain={[0, 100]} hide />
          <BarTooltip />
          <Bar dataKey="chance" />
          <Bar dataKey="unavailable" variant="hatched" />
        </EvilBarChart>
      ) : (
        <EvilAreaChart
          className="mt-3 aspect-auto h-44 w-full"
          config={roundChartConfig}
          curveType="step"
          data={rows}
          chartProps={{ margin: { left: 8, right: 8, top: 12, bottom: 0 } }}
        >
          <AreaGrid />
          <AreaXAxis dataKey="round" interval={0} />
          <AreaYAxis domain={[0, 100]} hide />
          <AreaTooltip cursor={false} valueFormatter={(value) => `${value}%`} />
          <Area dataKey="chance" variant="gradient">
            <Dot variant="default" />
            <ActiveDot variant="default" />
          </Area>
        </EvilAreaChart>
      )}
      {isMhtCet && program.roundDetails ? (
        <ol className="mt-3 border border-border">
          {program.roundDetails.map((detail, index) => {
            const conversion = detail?.conversionApplied
              ? getMhtCetStageBadgeShortLabel(detail.stageSemanticsId)
              : null;
            const conversionTitle = detail?.conversionApplied
              ? getMhtCetStageBadgeLabel(detail.stageSemanticsId)
              : null;
            return (
              <li
                // Four fixed CAP slots have no separate persistent identity.
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed round order
                key={index}
                className="border-b border-border px-2.5 py-2 last:border-b-0"
              >
                <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-2">
                  <span className="text-[11px] font-semibold tabular-nums text-foreground">
                    R{index + 1}
                  </span>
                  {detail ? (
                    <div className="min-w-0">
                      <p className="truncate text-[11px] leading-snug text-foreground">
                        <span className="tabular-nums">
                          {formatProbability(detail.probability)}
                        </span>
                        <MetaSep />
                        <span className="tabular-nums">
                          {formatInteger(detail.predictedClosingRank)}
                        </span>
                        <MetaSep />
                        {detail.sourceCode}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] leading-snug text-muted-foreground">
                        {shortScopeLabel(detail.effectiveAllocationScopeId)}
                        <MetaSep />
                        {detail.dataQuality}
                      </p>
                    </div>
                  ) : (
                    <p className="min-w-0 text-[11px] leading-snug text-pretty text-muted-foreground">
                      {program.roundAvailability?.[index]?.reason ??
                        "No official eligible cutoff published for this round"}
                    </p>
                  )}
                  <div className="flex items-center justify-end">
                    {conversion ? (
                      <ConversionBadge
                        label={conversion}
                        title={conversionTitle ?? undefined}
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

function MhtSeatPoolDetails({
  matchedPool,
  bestRoundDetail,
}: {
  matchedPool: string;
  bestRoundDetail: NonNullable<
    NonNullable<PredictorDisplayProgram["roundDetails"]>[number]
  > | null;
}) {
  return (
    <div className="mt-2.5 space-y-3">
      <MetaRow
        label="Matched pool"
        value={
          <span className="font-medium tracking-tight tabular-nums">
            {matchedPool}
          </span>
        }
      />
      {bestRoundDetail ? (
        <>
          <MetaRow
            label="Historical stage"
            value={`${bestRoundDetail.stageSourceYear} · ${bestRoundDetail.stageSourceLabel} · ${bestRoundDetail.conversionDescription}`}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <MetaRow
              label="Active rule"
              value={`${bestRoundDetail.activeRuleYear} Stage ${bestRoundDetail.activeRuleLabel}`}
            />
            <MetaRow
              label="Scopes"
              value={`${shortScopeLabel(bestRoundDetail.sourceSeatScopeId)} → ${shortScopeLabel(bestRoundDetail.effectiveAllocationScopeId)}`}
            />
          </div>
          <MetaRow
            label="Eligibility applied"
            value={bestRoundDetail.effectiveEligibilityDescription}
          />
        </>
      ) : null}
    </div>
  );
}

function MhtSeatPoolsConsidered({
  matchedPool,
  pools,
}: {
  matchedPool: string;
  pools: NonNullable<PredictorDisplayProgram["seatPoolsConsidered"]>;
}) {
  const ordered = [...pools].sort((left, right) => {
    const leftMatched = left.source_code === matchedPool ? 0 : 1;
    const rightMatched = right.source_code === matchedPool ? 0 : 1;
    if (leftMatched !== rightMatched) return leftMatched - rightMatched;
    if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
    return left.source_code.localeCompare(right.source_code);
  });

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-[11px] tracking-[0.05em] text-muted-foreground uppercase">
          Pools considered
        </p>
        <p className="text-[10px] tabular-nums text-muted-foreground">
          {ordered.length}
        </p>
      </div>
      <ul className="theme-scrollbar max-h-56 overflow-y-auto border border-border">
        {ordered.map((pool) => {
          const conversion = getMhtCetStageBadgeShortLabel(
            pool.stage_semantics_id,
          );
          const conversionTitle = getMhtCetStageBadgeLabel(
            pool.stage_semantics_id,
          );
          const isMatched = pool.source_code === matchedPool;
          const roundsLabel =
            pool.rounds.length === 4 ? "R1–R4" : `R${pool.rounds.join(", R")}`;
          const sameScope =
            pool.source_seat_scope_id === pool.effective_allocation_scope_id;
          const scopeLabel = sameScope
            ? shortScopeLabel(pool.source_seat_scope_id)
            : `${shortScopeLabel(pool.source_seat_scope_id)} → ${shortScopeLabel(pool.effective_allocation_scope_id)}`;

          return (
            <li
              key={`${pool.id}:${pool.stage_semantics_id}:${pool.source_seat_scope_id}:${pool.effective_allocation_scope_id}`}
              className={cn(
                "border-b border-border px-2 py-1.5 last:border-b-0",
                isMatched && "bg-muted/35",
              )}
            >
              <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-x-1.5">
                <span
                  className="truncate text-[11px] font-medium tabular-nums text-foreground"
                  title={pool.source_code}
                >
                  {pool.source_code}
                </span>
                <p className="min-w-0 truncate text-[10px] leading-snug">
                  <span
                    className={cn(
                      pool.eligible
                        ? "text-emerald-500"
                        : "text-muted-foreground",
                    )}
                  >
                    {pool.eligible ? "Eligible" : "Not eligible"}
                  </span>
                  <MetaSep />
                  <span className="text-muted-foreground">{roundsLabel}</span>
                  <MetaSep />
                  <span className="text-muted-foreground">{scopeLabel}</span>
                </p>
                <div className="flex items-center justify-end">
                  {conversion ? (
                    <ConversionBadge
                      label={conversion}
                      title={conversionTitle ?? undefined}
                    />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DetailTerm({ children }: { children: ReactNode }) {
  return (
    <dt className="pt-0.5 text-[11px] tracking-[0.05em] text-muted-foreground uppercase">
      {children}
    </dt>
  );
}

function DetailValue({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dd
      className={cn(
        "min-w-0 text-[12px] text-pretty text-foreground",
        className,
      )}
    >
      {children}
    </dd>
  );
}

/** Quiet label→value stack — hierarchy via weight, not oversized type. */
function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium tracking-[0.06em] text-muted-foreground/80 uppercase">
        {label}
      </p>
      <div className="mt-1 text-[11px] leading-relaxed text-pretty text-foreground/90">
        {value}
      </div>
    </div>
  );
}

function MetaSep() {
  return <span className="text-muted-foreground/50"> · </span>;
}

function shortScopeLabel(scopeId: string): string {
  switch (scopeId) {
    case "home-university":
      return "HU";
    case "other-university":
      return "OHU";
    case "state-level":
      return "State";
    case "maharashtra-state":
      return "MH";
    default:
      return scopeId.replaceAll("-", " ");
  }
}

function ConversionBadge({ label, title }: { label: string; title?: string }) {
  return (
    <span
      title={title ?? label}
      className="inline-flex shrink-0 items-center whitespace-nowrap border border-border/80 bg-muted/40 px-1.5 py-0.5 text-[9px] leading-none font-medium tracking-normal text-muted-foreground normal-case"
    >
      {label}
    </span>
  );
}

function formatProbability(value: number): string {
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}
