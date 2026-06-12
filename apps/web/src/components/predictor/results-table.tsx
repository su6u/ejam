/**
 * middle zone: one row per prediction; click opens the detail sheet
 * styled after raw/src dashboard-invoices — flat DashboardCard, borderless
 * cells, status badge column
 **/

"use client";

import type { PredictionProvenance } from "@ejam/data";
import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { resultsTableScrollClass, stickyGlassTableHeaderClass } from "@/components/app-layout";
import { formatInteger } from "@/components/formatter";
import { BandBadge } from "@/components/predictor/band-badge";
import { DataVersionFooter } from "@/components/predictor/data-version-footer";
import { InstituteTypeBadge } from "@/components/predictor/institute-type-badge";
import { programKey } from "@/components/predictor/program-key";
import {
  ResultsCardList,
  ResultsEmptyState,
} from "@/components/predictor/results-card-list";
import { ResultsCardShell } from "@/components/predictor/results-card-shell";
import { seatPoolLabel } from "@/components/predictor/results-row-format";
import { ResultsSort } from "@/components/predictor/results-sort";
import type { ResultsSortKey } from "@/components/predictor/results-sort-logic";
import { RoundProbabilityBars } from "@/components/predictor/round-probability-bars";
import { DigitGroup } from "@/components/transitions/digit-group";
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

  const headerExtra = useMemo(
    () => (
      <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
        {isFiltered ? (
          <>
            <DigitGroup value={String(rows.length)} />
            <span> of </span>
            <DigitGroup value={String(allRows.length)} />
          </>
        ) : (
          <>
            <DigitGroup value={String(rows.length)} />
            <span> program{rows.length === 1 ? "" : "s"}</span>
          </>
        )}
      </span>
    ),
    [rows.length, allRows.length, isFiltered],
  );

  return (
    <ResultsCardShell
      contentClassName={resultsTableScrollClass}
      toolbar={<ResultsSort sortBy={sortBy} onChange={onSortChange} />}
      footer={<DataVersionFooter provenance={provenance} />}
      headerExtra={headerExtra}
    >
      {rows.length === 0 ? (
        <ResultsEmptyState
          isFiltered={isFiltered}
          onClearFilters={onClearFilters}
        />
      ) : (
        <>
          <ResultsCardList
            className="lg:hidden"
            rows={rows}
            selectedId={selectedId}
            onSelect={onSelect}
          />
          <div className="hidden lg:contents">
            <Table>
              <TableHeader className={stickyGlassTableHeaderClass}>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="ps-6">Institute</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead className="min-w-24">Band</TableHead>
                  <TableHead className="min-w-24">Chance</TableHead>
                  <TableHead className="w-0 pe-6 whitespace-nowrap tabular-nums">
                    Closing rank
                  </TableHead>
                  <TableHead className="min-w-[7rem]">Seat pool</TableHead>
                  <TableHead className="w-10 pe-6 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:first-child]:border-t-0">
                {rows.map((row) => {
                  const id = programKey(row);
                  const isSelected = id === selectedId;
                  return (
                    <TableRow
                      key={id}
                      data-state={isSelected ? "selected" : undefined}
                      tabIndex={0}
                      role="button"
                      aria-label={`${row.institute_id}, ${row.program_name ?? row.program_id}`}
                      onClick={() => onSelect(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(row);
                        }
                      }}
                      className="h-12 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                      <TableCell className="min-w-24">
                        <BandBadge band={row.band} />
                      </TableCell>
                      <TableCell className="min-w-24">
                        <RoundProbabilityBars
                          className="shrink-0"
                          roundProbs={row.round_probs}
                          overallProbability={row.cumulative_probability}
                          fillRound={row.fill_round}
                        />
                      </TableCell>
                      <TableCell className="w-0 pe-6 whitespace-nowrap tabular-nums">
                        {formatInteger(row.predicted_closing_rank)}
                      </TableCell>
                      <TableCell className="min-w-[7rem] text-muted-foreground">
                        {seatPoolLabel(row)}
                      </TableCell>
                      <TableCell className="w-10 pe-6 text-right">
                        <ChevronRight
                          className={cn(
                            "size-4 text-muted-foreground/70 transition-transform duration-150 ease-out",
                            isSelected && "translate-x-0.5 text-foreground",
                          )}
                          aria-hidden
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ResultsCardShell>
  );
}
