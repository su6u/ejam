"use client";

import { CircleAlert } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { ResultsCardShell } from "@/components/predictor/results-card-shell";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

function EmptyIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <EmptyMedia className="mb-0 w-full max-w-72">
      <video
        autoPlay={!shouldReduceMotion}
        loop={!shouldReduceMotion}
        muted
        playsInline
        aria-hidden
        className="h-auto w-full object-contain"
      >
        <source src="/assets/eye.webm" type="video/webm" />
      </video>
    </EmptyMedia>
  );
}

export function EmptyState({ hasRank }: { hasRank: boolean }) {
  return (
    <ResultsCardShell>
      <Empty>
        <EmptyHeader>
          <EmptyIllustration />
          <EmptyDescription>
            {hasRank
              ? "Hit Predict on the left to see the colleges and programs ranked by chance, strongest options first within each band."
              : "Enter your rank and pick a category on the left, then run a prediction to see colleges ranked by your admission chance."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    </ResultsCardShell>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <ResultsCardShell>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlert aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Prediction failed</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    </ResultsCardShell>
  );
}

export function LoadingState() {
  return (
    <ResultsCardShell>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <div
              className="size-4 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground"
              aria-hidden
            />
          </EmptyMedia>
          <EmptyTitle>Generating predictions…</EmptyTitle>
          <EmptyDescription>
            Crunching cutoffs against your inputs.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </ResultsCardShell>
  );
}
