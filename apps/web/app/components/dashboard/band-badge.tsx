import type { ProbabilityBand } from "@ejam/data/college-predictor";
import { cn } from "@/lib/utils";

const BAND_STYLES: Record<ProbabilityBand, string> = {
  safe: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  target: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  reach: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  "long-shot": "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const BAND_LABEL: Record<ProbabilityBand, string> = {
  safe: "Safe",
  target: "Target",
  reach: "Reach",
  "long-shot": "Long-shot",
};

export function BandBadge({
  band,
  className,
}: {
  band: ProbabilityBand;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm border px-1.5 text-[10px] font-medium uppercase tracking-[0.06em]",
        BAND_STYLES[band],
        className,
      )}
    >
      {BAND_LABEL[band]}
    </span>
  );
}

export function formatProbability(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}
