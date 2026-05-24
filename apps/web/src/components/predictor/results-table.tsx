/**
 * middle zone: one row per prediction; click opens the detail sheet
 * styled after raw/src dashboard-invoices — flat DashboardCard, borderless
 * cells, status badge column
 **/

"use client";

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { ChevronRight } from "lucide-react";
import { formatInteger } from "@/components/formatter";
import { ResultsCardShell } from "@/components/predictor/results-card-shell";
import {
  ResultsSort,
  type ResultsSortKey,
} from "@/components/predictor/results-sort";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BAND_STYLES } from "@/lib/bands";
import { cn } from "@/lib/utils";

interface ResultsTableProps {
  rows: ProgramPrediction[];
  allRows: ProgramPrediction[];
  sortBy: ResultsSortKey;
  onSortChange: (next: ResultsSortKey) => void;
  selectedId: string | null;
  onSelect: (program: ProgramPrediction) => void;
  onClearFilters?: () => void;
}

export function ResultsTable({
  rows,
  allRows,
  sortBy,
  onSortChange,
  selectedId,
  onSelect,
  onClearFilters,
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
      headerExtra={
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {countLabel}
        </span>
      }
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_var(--border)]">
          <TableRow>
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
                      className="rounded-none"
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
                    <ProbabilityBar value={row.cumulative_probability} />
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

const BAND_BADGE = BAND_STYLES;

export function InstituteTypeBadge({ type }: { type: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-none font-mono text-[10px] text-muted-foreground"
    >
      {type}
    </Badge>
  );
}

export function BandBadge({ band }: { band: ProgramPrediction["band"] }) {
  const { label, color } = BAND_BADGE[band];
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center justify-center rounded-none px-2 text-xs font-medium whitespace-nowrap"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

function ProbabilityBar({ value }: { value: number }) {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/80"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {Math.round(pct * 100)}%
      </span>
    </div>
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

export function programKey(p: ProgramPrediction): string {
  return `${p.institute_id}::${p.program_id}::${p.seat_type}::${p.quota}::${p.gender}`;
}
