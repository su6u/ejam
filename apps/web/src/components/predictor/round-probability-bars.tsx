"use client";

import { classifyBand } from "@ejam/data/college-predictor";
import { useEffect, useRef } from "react";
import { BAND_STYLES } from "@/lib/bands";
import { cn } from "@/lib/utils";

const BAR_COUNT = 6;
const MIN_SCALE = 0.12;
const BAR_RISE_MS = 240;
const BAR_STAGGER_MS = 35;

interface RoundProbabilityBarsProps {
  roundProbs: number[];
  /** Cumulative chance through fill round — not a single-round incremental value */
  overallProbability: number;
  fillRound?: number;
  className?: string;
}

export function RoundProbabilityBars({
  roundProbs,
  overallProbability,
  fillRound,
  className,
}: RoundProbabilityBarsProps) {
  const barsRef = useRef<HTMLDivElement>(null);

  // Freeze bars after each entrance so DOM moves never restart animation mid-flight.
  useEffect(() => {
    const root = barsRef.current;
    if (!root) return;

    const bars = Array.from(root.querySelectorAll<HTMLElement>(".t-round-bar"));
    if (bars.length === 0) return;

    let remaining = bars.length;

    const freeze = (bar: HTMLElement) => {
      bar.style.animation = "none";
    };

    const onEnd = (event: Event) => {
      const animEvent = event as AnimationEvent;
      if (animEvent.animationName !== "round-bar-rise") return;
      if (!(event.currentTarget instanceof HTMLElement)) return;

      freeze(event.currentTarget);
      remaining -= 1;
      if (remaining <= 0) {
        for (const bar of bars) {
          bar.removeEventListener("animationend", onEnd);
        }
      }
    };

    for (const bar of bars) {
      bar.addEventListener("animationend", onEnd);
    }

    const fallback = window.setTimeout(
      () => {
        for (const bar of bars) {
          bar.removeEventListener("animationend", onEnd);
          freeze(bar);
        }
      },
      BAR_RISE_MS + BAR_STAGGER_MS * (BAR_COUNT - 1) + 50,
    );

    return () => {
      window.clearTimeout(fallback);
      for (const bar of bars) {
        bar.removeEventListener("animationend", onEnd);
      }
    };
  }, []);

  const rounds = roundProbs.slice(0, BAR_COUNT);
  while (rounds.length < BAR_COUNT) {
    rounds.push(rounds.at(-1) ?? 0);
  }

  const overallPct = Math.round(
    Math.min(1, Math.max(0, overallProbability)) * 100,
  );

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="img"
      aria-label={`${overallPct}% overall chance across ${BAR_COUNT} rounds`}
    >
      <div
        ref={barsRef}
        className="t-round-bars flex items-end gap-[2px]"
        aria-hidden
      >
        {rounds.map((prob, index) => {
          const roundNum = index + 1;
          const clamped = Math.min(1, Math.max(0, prob));
          const band = classifyBand(clamped);
          const { color, label } = BAND_STYLES[band];
          const scale = Math.max(MIN_SCALE, clamped);
          return (
            <div
              key={roundNum}
              className="t-round-bar h-3 w-[3px] shrink-0 rounded-none"
              data-round={roundNum}
              data-fill-round={fillRound === roundNum ? "" : undefined}
              data-band={band}
              style={
                {
                  "--bar-scale": String(scale),
                  backgroundColor: color,
                } as React.CSSProperties
              }
              title={`Round ${roundNum}: ${Math.round(clamped * 100)}% (${label})`}
            />
          );
        })}
      </div>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {overallPct}%
      </span>
    </div>
  );
}
