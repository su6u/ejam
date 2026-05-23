"use client";

import { Compass } from "lucide-react";

// icon slot is a placeholder; swap with a project illustration without
// touching the surrounding layout
export function EmptyState({ hasRank }: { hasRank: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-12">
      <div className="flex max-w-[440px] flex-col items-center text-center">
        <div className="mb-5 inline-flex size-12 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
          <Compass className="size-5" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          Predictions appear here
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {hasRank
            ? "Hit Predict on the left to see the colleges and programs ranked by chance, with the strongest options surfaced first inside each band."
            : "Enter your rank and pick a category on the left, then run a prediction to see colleges and programs ranked by your admission chance."}
        </p>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-12">
      <div className="flex max-w-[440px] flex-col items-center text-center">
        <div className="mb-4 inline-flex size-10 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive">
          !
        </div>
        <h3 className="text-base font-semibold text-foreground">
          Prediction failed
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}

export function NoMatchesState() {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-12">
      <div className="flex max-w-[440px] flex-col items-center text-center">
        <div className="mb-4 inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
          —
        </div>
        <h3 className="text-base font-semibold text-foreground">
          No results match these filters
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Loosen the filters on the left to see more programs, or run a new
          prediction with different inputs.
        </p>
      </div>
    </div>
  );
}
