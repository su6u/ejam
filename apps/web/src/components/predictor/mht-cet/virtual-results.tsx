"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { ResultsScrollStatus } from "@/components/predictor/mht-cet/pagination-controls";
import { programKey } from "@/components/predictor/program-key";
import { ResultCard } from "@/components/predictor/result-card";
import {
  RESULT_TABLE_COLUMNS,
  ResultTableRow,
} from "@/components/predictor/result-table-row";
import type { PredictorDisplayProgram } from "@/lib/predictor-adapters";
import { cn } from "@/lib/utils";

interface MhtCetVirtualResultsProps {
  rows: PredictorDisplayProgram[];
  total: number;
  selectedId: string | null;
  resultKey: string;
  hasMore: boolean;
  loadingMore: boolean;
  pageError: string | null;
  onSelect: (program: PredictorDisplayProgram) => void;
  onLoadMore: () => void;
}

const headerCellClass =
  "flex h-10 min-w-0 items-center px-2 text-left text-sm font-medium whitespace-nowrap text-foreground";

export function MhtCetVirtualResults(props: MhtCetVirtualResultsProps) {
  return (
    <>
      <MhtVirtualCards {...props} />
      <MhtVirtualTable {...props} />
    </>
  );
}

function MhtVirtualTable({
  rows,
  total,
  selectedId,
  resultKey,
  hasMore,
  loadingMore,
  pageError,
  onSelect,
  onLoadMore,
}: MhtCetVirtualResultsProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    getItemKey: (index) => programKey(rows[index]),
    overscan: 10,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: result identity resets the scroll position
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [resultKey]);

  return (
    <section
      ref={scrollRef}
      className="theme-scrollbar hidden min-h-0 flex-1 overflow-auto lg:block"
      aria-busy={loadingMore}
      aria-label="MHT-CET prediction results"
    >
      <div className="w-full min-w-0 text-sm">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50">
          <div
            className="grid w-full"
            style={{ gridTemplateColumns: RESULT_TABLE_COLUMNS }}
          >
            <div className={cn(headerCellClass, "ps-6")}>Institute</div>
            <div className={headerCellClass}>Program</div>
            <div className={headerCellClass}>Band</div>
            <div className={headerCellClass}>Chance</div>
            <div className={cn(headerCellClass, "tabular-nums")}>
              Closing rank
            </div>
            <div className={headerCellClass}>Seat pool</div>
            <div className="pe-6" />
          </div>
        </div>
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <ResultTableRow
                key={virtualRow.key}
                row={row}
                selectedId={selectedId}
                onSelect={onSelect}
                virtual
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
      <ResultsScrollStatus
        loaded={rows.length}
        total={total}
        hasMore={hasMore}
        loading={loadingMore}
        error={pageError}
        onLoadMore={onLoadMore}
        scrollRootRef={scrollRef}
      />
    </section>
  );
}

function MhtVirtualCards({
  rows,
  total,
  selectedId,
  resultKey,
  hasMore,
  loadingMore,
  pageError,
  onSelect,
  onLoadMore,
}: MhtCetVirtualResultsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 132,
    getItemKey: (index) => programKey(rows[index]),
    overscan: 10,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: result identity resets scroll and measurements
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    virtualizer.measure();
  }, [resultKey, virtualizer]);

  return (
    <div
      ref={scrollRef}
      className="theme-scrollbar min-h-0 flex-1 overflow-y-auto lg:hidden"
      aria-busy={loadingMore}
    >
      <ul
        className="relative w-full"
        aria-label="MHT-CET prediction results"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <li
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              aria-setsize={total}
              aria-posinset={virtualRow.index + 1}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <ResultCard
                row={row}
                selected={programKey(row) === selectedId}
                onSelect={onSelect}
              />
            </li>
          );
        })}
      </ul>
      <ResultsScrollStatus
        loaded={rows.length}
        total={total}
        hasMore={hasMore}
        loading={loadingMore}
        error={pageError}
        onLoadMore={onLoadMore}
        scrollRootRef={scrollRef}
      />
    </div>
  );
}
