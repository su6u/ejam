/**
 * middle zone: one row per prediction; row click opens the detail sheet
 * unpaginated by design — the engine truncates by probability threshold
 **/

"use client";

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { BandBadge, formatProbability } from "./band-badge";

interface ResultsTableProps {
  rows: ProgramPrediction[];
  selectedId: string | null;
  onSelect: (program: ProgramPrediction) => void;
}

export function ResultsTable({
  rows,
  selectedId,
  onSelect,
}: ResultsTableProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[13px] font-semibold text-foreground">
            Prediction results
          </h2>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {rows.length} program{rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-card/40 hover:bg-card/40">
              <Th className="min-w-[260px]">Institute</Th>
              <Th className="min-w-[200px]">Program</Th>
              <Th className="w-[120px]">Band</Th>
              <Th className="w-[180px]">Chance</Th>
              <Th className="w-[140px] text-right">Closing rank</Th>
              <Th className="w-[160px]">Seat pool</Th>
              <Th className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const id = programKey(row);
              const isSelected = id === selectedId;
              return (
                <TableRow
                  key={id}
                  data-state={isSelected ? "selected" : undefined}
                  onClick={() => onSelect(row)}
                  className={cn(
                    "cursor-pointer border-border transition-colors",
                    "hover:bg-card/60",
                    isSelected && "bg-card/80",
                  )}
                >
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <InstituteTypeChip instype={row.instype} />
                      <span className="truncate text-[12px] font-medium text-foreground">
                        {row.institute_id}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="truncate text-[12px] text-foreground">
                      {row.program_name ?? row.program_id}
                    </span>
                    {row.degree ? (
                      <span className="ml-1.5 text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                        {row.degree}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <BandBadge band={row.band} />
                  </Td>
                  <Td>
                    <ProbabilityBar value={row.cumulative_probability} />
                  </Td>
                  <Td className="text-right tabular-nums">
                    <span className="text-[12px] font-medium text-foreground">
                      {row.predicted_closing_rank.toLocaleString()}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[11px] text-muted-foreground">
                      {seatPoolLabel(row)}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <ChevronRight
                      className={cn(
                        "size-3.5 text-muted-foreground/70 transition-transform",
                        isSelected && "translate-x-0.5 text-foreground",
                      )}
                      aria-hidden
                    />
                  </Td>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-9 border-r border-border bg-transparent px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground last:border-r-0",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <TableCell
      className={cn(
        "h-11 border-r border-border px-3 align-middle last:border-r-0",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

function InstituteTypeChip({ instype }: { instype: string }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-sm border border-border bg-card px-1.5 text-[10px] font-semibold tracking-[0.05em] text-muted-foreground">
      {instype}
    </span>
  );
}

function ProbabilityBar({ value }: { value: number }) {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-[90px] overflow-hidden rounded-full bg-border/60">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/80"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="w-9 text-right text-[11px] font-medium tabular-nums text-foreground">
        {formatProbability(pct)}
      </span>
    </div>
  );
}

function seatPoolLabel(row: ProgramPrediction): string {
  const parts = [
    row.seat_type,
    row.quota.toUpperCase(),
    genderShort(row.gender),
  ];
  return parts.filter(Boolean).join(" · ");
}

function genderShort(gender: string): string {
  if (gender.startsWith("Gender")) return "GN";
  if (gender.startsWith("Female")) return "Female";
  return gender;
}

export function programKey(p: ProgramPrediction): string {
  return `${p.institute_id}::${p.program_id}::${p.seat_type}::${p.quota}::${p.gender}`;
}
