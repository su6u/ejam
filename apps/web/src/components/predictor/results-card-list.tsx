"use client";

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { formatInteger } from "@/components/formatter";
import { BandBadge } from "@/components/predictor/band-badge";
import { InstituteTypeBadge } from "@/components/predictor/institute-type-badge";
import { programKey } from "@/components/predictor/program-key";
import { seatPoolLabel } from "@/components/predictor/results-row-format";
import { RoundProbabilityBars } from "@/components/predictor/round-probability-bars";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** cap the enter stagger so long lists never wait on dozens of delays */
const MAX_STAGGERED_CARDS = 8;
const CARD_STAGGER_MS = 40;

interface ResultsCardListProps {
  rows: ProgramPrediction[];
  selectedId: string | null;
  onSelect: (program: ProgramPrediction) => void;
  className?: string;
}

export function ResultsCardList({
  rows,
  selectedId,
  onSelect,
  className,
}: ResultsCardListProps) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {rows.map((row, index) => {
        const id = programKey(row);
        const isSelected = id === selectedId;
        const delay =
          index < MAX_STAGGERED_CARDS ? `${index * CARD_STAGGER_MS}ms` : "0ms";

        return (
          <li key={id}>
            <button
              type="button"
              data-state={isSelected ? "selected" : undefined}
              aria-label={`${row.institute_id}, ${row.program_name ?? row.program_id}`}
              onClick={() => onSelect(row)}
              style={{ animationDelay: delay }}
              className={cn(
                "results-card-enter flex w-full flex-col gap-2 border-b border-border px-4 py-3.5 text-left",
                "transition-colors hover:bg-muted/50 active:bg-muted data-[state=selected]:bg-muted",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <InstituteTypeBadge type={row.instype} />
                  <span className="truncate font-medium">
                    {row.institute_id}
                  </span>
                </div>
                <BandBadge band={row.band} />
              </div>

              <div className="min-w-0 text-sm text-muted-foreground">
                <span className="line-clamp-1">
                  {row.program_name ?? row.program_id}
                  {row.degree ? (
                    <span className="ms-1.5 text-[10px] uppercase text-muted-foreground/80">
                      {row.degree}
                    </span>
                  ) : null}
                </span>
              </div>

              <div className="flex items-end justify-between gap-3 pt-0.5">
                <RoundProbabilityBars
                  interactive={false}
                  roundProbs={row.round_probs}
                  overallProbability={row.cumulative_probability}
                  fillRound={row.fill_round}
                />
                <div className="flex shrink-0 flex-col items-end leading-tight">
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {formatInteger(row.predicted_closing_rank)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {seatPoolLabel(row)}
                  </span>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ResultsEmptyState({
  isFiltered,
  onClearFilters,
}: {
  isFiltered: boolean;
  onClearFilters?: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
      <span className="text-pretty">No programs match the active filters.</span>
      {isFiltered && onClearFilters ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-none border-border bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground dark:bg-transparent dark:hover:bg-transparent"
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
