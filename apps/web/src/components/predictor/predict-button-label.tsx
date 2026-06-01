"use client";

import { cn } from "@/lib/utils";

const LABEL_IDLE = "Predict colleges";
const LABEL_LOADING = "Predicting…";

interface PredictButtonLabelProps {
  loading: boolean;
  className?: string;
}

/**
 * Both labels stay in the DOM (grid stack) so the button never collapses to zero
 * width during the blur slide. Pure CSS — no AnimatePresence gap.
 */
export function PredictButtonLabel({
  loading,
  className,
}: PredictButtonLabelProps) {
  return (
    <span
      className={cn("t-predict-label-swap", className)}
      data-loading={loading ? "true" : "false"}
      aria-live="polite"
    >
      <span className="t-predict-label-layer label-idle">{LABEL_IDLE}</span>
      <span className="t-predict-label-layer label-loading">{LABEL_LOADING}</span>
    </span>
  );
}
