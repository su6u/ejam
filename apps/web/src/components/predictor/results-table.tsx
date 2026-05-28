/**
 * middle zone: one row per prediction; click opens the detail sheet
 * styled after raw/src dashboard-invoices — flat DashboardCard, borderless
 * cells, status badge column
 **/

"use client";

import { stickyGlassTableHeaderClass } from "@/components/app-layout";
import type { PredictionProvenance } from "@ejam/data";
import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { ChevronRight } from "lucide-react";
import { formatInteger } from "@/components/formatter";
import { BandBadge } from "@/components/predictor/band-badge";
import { DataVersionFooter } from "@/components/predictor/data-version-footer";
import { InstituteTypeBadge } from "@/components/predictor/institute-type-badge";
import { programKey } from "@/components/predictor/program-key";
import { ResultsCardShell } from "@/components/predictor/results-card-shell";
import { ResultsSort } from "@/components/predictor/results-sort";
import type { ResultsSortKey } from "@/components/predictor/results-sort-logic";
import { RoundProbabilityBars } from "@/components/predictor/round-probability-bars";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ResultsTableProps {
  rows: ProgramPrediction[];
  allRows: ProgramPrediction[];
  sortBy: ResultsSortKey;
  onSortChange: (next: ResultsSortKey) => void;
  selectedId: string | null;
  onSelect: (program: ProgramPrediction) => void;
  onClearFilters?: () => void;
  provenance?: PredictionProvenance | null;
}

export function ResultsTable({
  rows,
  allRows,
  sortBy,
  onSortChange,
  selectedId,
  onSelect,
  onClearFilters,
  provenance,
}: ResultsTableProps) {
  const isFiltered = rows.length !== allRows.length;
  const countLabel =
    rows.length === allRows.length
      ? `${rows.length} program${rows.length === 1 ? "" : "s"}`
      : `${rows.length} of ${allRows.length}`;

  return (
    <ResultsCardShell
      contentClassName="no-scrollbar overflow-y-auto [&_[data-slot=table-container]]:no-scrollbar"
      toolbar={<ResultsSort sortBy={sortBy} onChange={onSortChange} />}
      footer={<DataVersionFooter provenance={provenance} />}
      headerExtra={
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {countLabel}
        </span>
      }
    >
      <Table>
        <TableHeader className={stickyGlassTableHeaderClass}>
          <TableRow className="hover:bg-transparent">
            <TableHead className="ps-6">Institute</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Band</TableHead>
            <TableHead>Chance</TableHead>
            <TableHead className="w-0 pe-6 whitespace-nowrap tabular-nums">
              Closing rank
            </TableHead>
            <TableHead>Seat pool</TableHead>
            <TableHead className="pe-6 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:first-child]:border-t-0">
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={7}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-2">
                  <span>No programs match the active filters.</span>
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
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const id = programKey(row);
              const isSelected = id === selectedId;
              return (
                <TableRow
                  key={id}
                  data-state={isSelected ? "selected" : undefined}
                  onClick={() => onSelect(row)}
                  className="h-12 cursor-pointer"
                >
                  <TableCell className="ps-6">
                    <div className="flex items-center gap-2">
                      <InstituteTypeBadge type={row.instype} />
                      <span className="max-w-56 truncate font-medium">
                        {row.institute_id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64 truncate">
                    <span>{row.program_name ?? row.program_id}</span>
                    {row.degree ? (
                      <span className="ms-1.5 text-[10px] text-muted-foreground uppercase">
                        {row.degree}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <BandBadge band={row.band} />
                  </TableCell>
                  <TableCell>
                    <RoundProbabilityBars
                      key={sortBy}
                      roundProbs={row.round_probs}
                      overallProbability={row.cumulative_probability}
                      fillRound={row.fill_round}
                    />
                  </TableCell>
                  <TableCell className="w-0 pe-6 whitespace-nowrap tabular-nums">
                    {formatInteger(row.predicted_closing_rank)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {seatPoolLabel(row)}
                  </TableCell>
                  <TableCell className="pe-6 text-right">
                    <ChevronRight
                      className={cn(
                        "size-4 text-muted-foreground/70 transition-transform",
                        isSelected && "translate-x-0.5 text-foreground",
                      )}
                      aria-hidden
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </ResultsCardShell>
  );
}

function seatPoolLabel(row: ProgramPrediction): string {
  return [row.seat_type, row.quota.toUpperCase(), genderShort(row.gender)]
    .filter(Boolean)
    .join(" · ");
}

function genderShort(gender: string): string {
  if (gender.startsWith("Gender")) return "GN";
  if (gender.startsWith("Female")) return "F";
  return gender;
}
