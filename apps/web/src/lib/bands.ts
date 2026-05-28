import type { ProbabilityBand } from "@ejam/data/college-predictor";

export const BAND_STYLES: Record<
  ProbabilityBand,
  { label: string; color: string }
> = {
  safe: { label: "Safe", color: "#00C951" },
  target: { label: "Target", color: "#52A2FF" },
  reach: { label: "Reach", color: "#FEB903" },
  "long-shot": { label: "Long-shot", color: "#FF6467" },
};

export const BAND_FILTER_OPTIONS: Array<{
  id: ProbabilityBand;
  label: string;
  color: string;
}> = (
  Object.entries(BAND_STYLES) as Array<
    [ProbabilityBand, (typeof BAND_STYLES)[ProbabilityBand]]
  >
).map(([id, { label, color }]) => ({ id, label, color }));
