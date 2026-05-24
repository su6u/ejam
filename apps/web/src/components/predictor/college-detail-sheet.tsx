/**
 * right-side drawer for a single prediction
 * shows data quality and the per-round trajectory the table omits
 **/

"use client";

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { DashboardCard } from "@/components/dashboard-card";
import { formatInteger } from "@/components/formatter";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BandBadge, InstituteTypeBadge } from "./results-table";

interface CollegeDetailSheetProps {
  program: ProgramPrediction | null;
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
        className="no-scrollbar w-full overflow-y-auto bg-background p-0 text-foreground sm:max-w-xl"
      >
        {program ? <DetailBody program={program} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({ program }: { program: ProgramPrediction }) {
  return (
    <>
      <SheetHeader className="border-b border-border p-4 pb-3">
        <div className="flex items-start gap-2">
          <InstituteTypeBadge type={program.instype} />
          <BandBadge band={program.band} />
        </div>
        <SheetTitle className="mt-1.5 leading-tight">
          {program.institute_id}
        </SheetTitle>
        <SheetDescription className="leading-relaxed">
          {program.program_name ?? program.program_id}
          {program.degree ? (
            <span className="ml-1.5 text-[11px] uppercase tracking-[0.05em] text-muted-foreground/80">
              {program.degree} · {program.duration_years}y
            </span>
          ) : null}
        </SheetDescription>
      </SheetHeader>

      <section className="grid grid-cols-2 gap-px border-b border-border bg-border">
        <ProgramMetricCard
          label="Chance"
          value={formatProbability(program.cumulative_probability)}
          caption="At your rank"
        />
        <ProgramMetricCard
          label="Predicted closing"
          value={formatInteger(program.predicted_closing_rank)}
          caption="Estimated rank"
        />
        <ProgramMetricCard
          label="Weighted mean"
          value={formatInteger(program.weighted_mean)}
          caption="Historical center"
        />
        <ProgramMetricCard
          label="Sigma"
          value={formatInteger(program.sigma_effective)}
          caption="Model spread"
        />
      </section>

      <RoundProbabilityChart program={program} />

      <section className="border-b border-border p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Seat pool
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-y-2 text-[12px]">
          <DT>Category</DT>
          <DD>{program.seat_type}</DD>
          <DT>Quota</DT>
          <DD>{program.quota.toUpperCase()}</DD>
          <DT>Gender</DT>
          <DD>{program.gender}</DD>
          {program.state ? (
            <>
              <DT>Home state</DT>
              <DD>{program.state}</DD>
            </>
          ) : null}
        </dl>
      </section>

      <section className="border-b border-border p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Data quality
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-y-2 text-[12px]">
          <DT>Signal</DT>
          <DD className="capitalize">{program.data_quality}</DD>
          <DT>Years of data</DT>
          <DD className="tabular-nums">{program.years_of_data}</DD>
          <DT>Most recent</DT>
          <DD className="tabular-nums">{program.last_data_year}</DD>
          <DT>Final round</DT>
          <DD className="tabular-nums">{program.fill_round}</DD>
        </dl>
      </section>

      <section className="p-4 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Predictions are estimated from historical cutoffs and trend slope —
        actual round cutoffs can drift with seat-matrix changes, demand shifts,
        and counselling rule updates each year.
      </section>
    </>
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
        <CardTitle className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
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
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function RoundProbabilityChart({ program }: { program: ProgramPrediction }) {
  const rows = program.round_probs.map((value, index) => ({
    round: `R${index + 1}`,
    chance: Math.round(Math.min(1, Math.max(0, value)) * 100),
  }));

  return (
    <section className="border-b border-border p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Round-by-round probability
        </h3>
        <p className="text-[11px] text-muted-foreground/80">
          Cumulative chance the seat closes at or after your rank by round{" "}
          {program.fill_round}.
        </p>
      </div>
      <ChartContainer
        className="mt-4 aspect-auto h-44 w-full"
        config={roundChartConfig}
      >
        <LineChart
          accessibilityLayer
          data={rows}
          margin={{ left: 8, right: 8, top: 12, bottom: 0 }}
        >
          <CartesianGrid className="stroke-border" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="round"
            interval={0}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis domain={[0, 100]} hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value) => `${value}%`}
              />
            }
            cursor={false}
          />
          <Line
            dataKey="chance"
            dot={{ r: 3 }}
            stroke="var(--color-chance)"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>
    </section>
  );
}

function DT({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
      {children}
    </dt>
  );
}

function DD({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <dd className={cn("text-[12px] text-foreground", className)}>{children}</dd>
  );
}

function formatProbability(value: number): string {
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}
