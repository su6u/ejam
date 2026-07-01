"use client";

import type { PredictionProvenance } from "@ejam/data";
import type { CollegePredictionResult } from "@ejam/data/college-predictor";
import { useReducedMotion } from "motion/react";
import { formatInteger } from "@/components/formatter";
import { LoadingAnimation } from "@/components/loading-animation";
import { DataVersionFooter } from "@/components/predictor/data-version-footer";
import { ResultsCardShell } from "@/components/predictor/results-card-shell";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { deferAfterPress } from "@/lib/pressable";

const emptyStateActionClass =
  "rounded-none border-border bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground dark:bg-transparent dark:hover:bg-transparent";

function StateIllustration({ src }: { src: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <EmptyMedia className="mb-0 w-full max-w-72">
      <video
        autoPlay={!shouldReduceMotion}
        loop={!shouldReduceMotion}
        muted
        playsInline
        preload="auto"
        aria-hidden
        tabIndex={-1}
        className="h-auto w-full object-contain"
      >
        <source src={src} type="video/webm" />
      </video>
    </EmptyMedia>
  );
}

function emptyDescription({
  hasPredicted,
  metadata,
}: {
  hasPredicted: boolean;
  metadata?: CollegePredictionResult["metadata"];
}): string {
  if (!hasPredicted) {
    return "Pick an exam, enter your rank, then run Predict colleges to see options ranked by admission chance.";
  }

  if (metadata && metadata.hidden_programs > 0) {
    return `Nothing clears our 10% chance cutoff at this rank. ${formatInteger(metadata.hidden_programs)} long-shots are hidden. Try a better (lower) rank to see likely options.`;
  }

  if (metadata && metadata.total_matching_programs === 0) {
    return "No seats match your category, gender, and quota at this rank.";
  }

  return "No colleges with a meaningful chance at this rank. Try a better (lower) rank.";
}

export function EmptyState({
  hasPredicted = false,
  metadata,
  includeAll = false,
  onShowLongShots,
  provenance,
}: {
  hasPredicted?: boolean;
  metadata?: CollegePredictionResult["metadata"];
  includeAll?: boolean;
  onShowLongShots?: () => void;
  provenance?: PredictionProvenance | null;
}) {
  const showLongShotsAction =
    hasPredicted &&
    !includeAll &&
    (metadata?.hidden_programs ?? 0) > 0 &&
    onShowLongShots;

  return (
    <ResultsCardShell
      description={null}
      footer={<DataVersionFooter provenance={provenance} />}
    >
      <Empty>
        <EmptyHeader>
          <StateIllustration src="/media/empty.webm" />
          <EmptyDescription>
            {emptyDescription({ hasPredicted, metadata })}
          </EmptyDescription>
        </EmptyHeader>
        {showLongShotsAction ? (
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={emptyStateActionClass}
              onClick={() => deferAfterPress(onShowLongShots)}
            >
              Show long-shots
            </Button>
          </EmptyContent>
        ) : (
          <EmptyContent />
        )}
      </Empty>
    </ResultsCardShell>
  );
}

export function ErrorState({
  message,
  provenance,
}: {
  message: string;
  provenance?: PredictionProvenance | null;
}) {
  return (
    <ResultsCardShell
      description={null}
      footer={<DataVersionFooter provenance={provenance} />}
    >
      <Empty className="min-h-0" role="alert">
        <EmptyHeader className="my-auto">
          <StateIllustration src="/media/404.webm" />
          <EmptyDescription>
            <span className="mb-1 block font-heading text-sm font-medium tracking-tight text-foreground">
              Prediction failed
            </span>
            {message}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </ResultsCardShell>
  );
}

export function LoadingState({
  provenance,
}: {
  provenance?: PredictionProvenance | null;
}) {
  return (
    <ResultsCardShell
      description={null}
      footer={<DataVersionFooter provenance={provenance} />}
    >
      <Empty role="status" aria-live="polite" aria-busy="true">
        <EmptyHeader>
          <EmptyMedia className="mb-0 bg-transparent">
            <LoadingAnimation className="size-8" aria-hidden />
          </EmptyMedia>
          <EmptyDescription>Loading predictions…</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </ResultsCardShell>
  );
}
