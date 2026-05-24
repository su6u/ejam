import type { ProbabilityBand } from "@ejam/data/college-predictor";
import type { LucideIcon } from "lucide-react";
import { Shield, Target, TrendingUp, Zap } from "lucide-react";

export const BAND_STYLES: Record<
  ProbabilityBand,
  { label: string; color: string }
> = {
  safe: { label: "Safe", color: "#00D5BE" },
  target: { label: "Target", color: "#52A2FF" },
  reach: { label: "Reach", color: "#FEB903" },
  "long-shot": { label: "Long-shot", color: "#FF6467" },
};

export const BAND_ORDER: Record<ProbabilityBand, number> = {
  safe: 0,
  target: 1,
  reach: 2,
  "long-shot": 3,
};

export const BAND_FILTER_OPTIONS: Array<{
  id: ProbabilityBand;
  label: string;
  icon: LucideIcon;
  color: string;
}> = [
  { id: "safe", label: "Safe", icon: Shield, color: BAND_STYLES.safe.color },
  {
    id: "target",
    label: "Target",
    icon: Target,
    color: BAND_STYLES.target.color,
  },
  {
    id: "reach",
    label: "Reach",
    icon: TrendingUp,
    color: BAND_STYLES.reach.color,
  },
  {
    id: "long-shot",
    label: "Long-shot",
    icon: Zap,
    color: BAND_STYLES["long-shot"].color,
  },
];
