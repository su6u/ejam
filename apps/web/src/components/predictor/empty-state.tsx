"use client";

import type { PredictionProvenance } from "@ejam/data";
import { useReducedMotion } from "motion/react";
import { LoadingAnimation } from "@/components/loading-animation";
import { DataVersionFooter } from "@/components/predictor/data-version-footer";
import { ResultsCardShell } from "@/components/predictor/results-card-shell";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";

function StateIllustration({ src }: { src: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <EmptyMedia className="mb-0 w-full max-w-72">
      <video
        autoPlay={!shouldReduceMotion}
        loop={!shouldReduceMotion}
        muted
        playsInline
        aria-hidden
        tabIndex={-1}
        className="h-auto w-full object-contain"
      >
        <source src={src} type="video/webm" />
      </video>
    </EmptyMedia>
  );
}

function emptyDescription({ hasPredicted }: { hasPredicted: boolean }): string {
  if (hasPredicted) {
    return "No colleges with a meaningful chance at this rank — try a lower rank.";
  }
  return "Pick an exam, enter your rank, then run Predict colleges to see options ranked by admission chance.";
}

export function EmptyState({
  hasPredicted = false,
  provenance,
}: {
  hasPredicted?: boolean;
  provenance?: PredictionProvenance | null;
}) {
  return (
    <ResultsCardShell
      description={null}
      footer={<DataVersionFooter provenance={provenance} />}
    >
      <Empty>
        <EmptyHeader>
          <StateIllustration src="/media/empty.webm" />
          <EmptyDescription>
            {emptyDescription({ hasPredicted })}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
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
