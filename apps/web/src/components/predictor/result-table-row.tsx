"use client";

import { ChevronRight } from "lucide-react";
import type { CSSProperties, KeyboardEvent } from "react";
import { formatInteger } from "@/components/formatter";
import { BandBadge } from "@/components/predictor/band-badge";
import { InstituteTypeBadge } from "@/components/predictor/institute-type-badge";
import { programKey } from "@/components/predictor/program-key";
import { RoundProbabilityBars } from "@/components/predictor/round-probability-bars";
import { TableCell, TableRow } from "@/components/ui/table";
import type { PredictorDisplayProgram } from "@/lib/predictor-adapters";
import { cn } from "@/lib/utils";

/** Shared desktop column track — fixed metrics, flexible institute/program. */
export const RESULT_TABLE_COLUMNS =
  "minmax(0,1.7fr) minmax(0,1.35fr) 4.25rem 5.5rem 5.75rem 4.5rem 2.5rem";

const cellClass = "flex min-w-0 items-center overflow-hidden px-2";

export function ResultTableRow({
  row,
  selectedId,
  onSelect,
  style,
  virtual,
}: {
  row: PredictorDisplayProgram;
  selectedId: string | null;
  onSelect: (program: PredictorDisplayProgram) => void;
  style?: CSSProperties;
  virtual?: boolean;
}) {
  const id = programKey(row);
  const isSelected = id === selectedId;
  const handleKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement | HTMLButtonElement>,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(row);
    }
  };

  const institute = (
    <div className="flex min-w-0 items-center gap-2">
      <InstituteTypeBadge type={row.instituteType} />
      <span className="min-w-0 flex-1 truncate font-medium">
        {row.instituteName}
      </span>
    </div>
  );

  const program = (
    <div className="min-w-0 truncate">
      <span>{row.programName}</span>
      {row.degree ? (
        <span className="ms-1.5 text-[10px] text-muted-foreground uppercase">
          {row.degree}
        </span>
      ) : null}
    </div>
  );

  const chance = (
    <RoundProbabilityBars
      className="min-w-0"
      roundProbs={row.roundProbabilities}
      overallProbability={row.overallProbability}
      roundDetails={row.roundDetails}
      roundAvailability={row.roundAvailability}
      roundCount={row.roundCount}
      interactive={false}
    />
  );

  const chevron = (
    <ChevronRight
      className={cn(
        "size-4 text-muted-foreground/70 transition-transform duration-150 ease-out",
        isSelected && "translate-x-0.5 text-foreground",
      )}
      aria-hidden
    />
  );

  const rowClass = cn(
    "h-12 cursor-pointer border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  );

  if (virtual) {
    return (
      <button
        type="button"
        data-state={isSelected ? "selected" : undefined}
        aria-label={`${row.instituteName}, ${row.programName}`}
        onClick={() => onSelect(row)}
        onKeyDown={handleKeyDown}
        style={{
          ...style,
          display: "grid",
          gridTemplateColumns: RESULT_TABLE_COLUMNS,
        }}
        className={cn(rowClass, "absolute inset-x-0 top-0 w-full text-left")}
      >
        <div className={cn(cellClass, "ps-6")}>{institute}</div>
        <div className={cellClass}>{program}</div>
        <div className={cellClass}>
          <BandBadge band={row.band} />
        </div>
        <div className={cellClass}>{chance}</div>
        <div className={cn(cellClass, "whitespace-nowrap tabular-nums")}>
          {formatInteger(row.predictedClosingRank)}
        </div>
        <div className={cn(cellClass, "text-muted-foreground")}>
          <span className="truncate">{row.seatPoolLabel}</span>
        </div>
        <div className="flex items-center justify-end pe-6">{chevron}</div>
      </button>
    );
  }

  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      tabIndex={0}
      role="button"
      aria-label={`${row.instituteName}, ${row.programName}`}
      onClick={() => onSelect(row)}
      onKeyDown={handleKeyDown}
      style={style}
      className={rowClass}
    >
      <TableCell className="min-w-0 overflow-hidden ps-6">
        {institute}
      </TableCell>
      <TableCell className="min-w-0 overflow-hidden">{program}</TableCell>
      <TableCell className="min-w-0 overflow-hidden">
        <BandBadge band={row.band} />
      </TableCell>
      <TableCell className="min-w-0 overflow-hidden">{chance}</TableCell>
      <TableCell className="min-w-0 overflow-hidden whitespace-nowrap tabular-nums">
        {formatInteger(row.predictedClosingRank)}
      </TableCell>
      <TableCell className="min-w-0 truncate text-muted-foreground">
        {row.seatPoolLabel}
      </TableCell>
      <TableCell className="pe-6 text-right">{chevron}</TableCell>
    </TableRow>
  );
}
