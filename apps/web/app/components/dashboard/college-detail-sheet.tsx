/**
 * right-side drawer for a single prediction
 * shows data quality and the per-round trajectory the table omits
 **/

"use client";

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BandBadge, formatProbability } from "./band-badge";

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
        className="w-full overflow-y-auto bg-card sm:max-w-md"
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
          <span className="inline-flex h-5 shrink-0 items-center rounded-sm border border-border bg-background px-1.5 text-[10px] font-semibold tracking-[0.05em] text-muted-foreground">
            {program.instype}
          </span>
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
        <Metric
          label="Chance"
          value={formatProbability(program.cumulative_probability)}
        />
        <Metric
          label="Predicted closing"
          value={program.predicted_closing_rank.toLocaleString()}
          mono
        />
        <Metric
          label="Weighted mean"
          value={program.weighted_mean.toLocaleString()}
          mono
        />
        <Metric
          label="Sigma"
          value={program.sigma_effective.toLocaleString()}
          mono
        />
      </section>

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
          Round-by-round probability
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          Cumulative chance the seat closes at or after your rank by round{" "}
          {program.fill_round}.
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          {program.round_probs.map((p, i) => {
            const round = i + 1;
            return <RoundBar key={`r${round}`} round={round} value={p} />;
          })}
        </div>
      </section>

      <section className="border-b border-border p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Data quality
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-y-2 text-[12px]">
          <DT>Signal</DT>
          <DD className="capitalize">{program.data_quality}</DD>
          <DT>Years of data</DT>
          <DD>{program.years_of_data}</DD>
          <DT>Most recent</DT>
          <DD>{program.last_data_year}</DD>
          <DT>Final round</DT>
          <DD>{program.fill_round}</DD>
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

function Metric({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-base font-semibold text-foreground",
          mono && "tabular-nums",
        )}
      >
        {value}
      </div>
    </div>
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

function RoundBar({ round, value }: { round: number; value: number }) {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-[11px] text-muted-foreground">
        R{round}
      </span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="w-10 text-right text-[11px] tabular-nums text-foreground">
        {formatProbability(pct)}
      </span>
    </div>
  );
}
