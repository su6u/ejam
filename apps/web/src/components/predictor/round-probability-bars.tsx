"use client";

import { classifyBand } from "@ejam/data/college-predictor";
import { useEffect, useMemo, useRef, useState } from "react";
import { BAND_STYLES } from "@/lib/bands";
import { cn } from "@/lib/utils";

const BAR_COUNT = 6;
const MIN_SCALE = 0.12;
const BAR_RISE_MS = 240;
const BAR_STAGGER_MS = 35;

interface RoundProbabilityBarsProps {
  roundProbs: number[];
  /** Mean cumulative chance across rounds 1..fill_round */
  overallProbability: number;
  fillRound?: number;
  className?: string;
}

function clampProbability(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function toPercent(value: number): number {
  return Math.round(clampProbability(value) * 100);
}

/** Pick the bar whose center is closest to the pointer — avoids overlap skew */
function roundAtPointer(root: HTMLElement, clientX: number): number | null {
  const bars = Array.from(root.querySelectorAll<HTMLElement>(".t-round-bar"));
  if (bars.length === 0) return null;

  const { left, right } = root.getBoundingClientRect();
  if (clientX < left || clientX > right) return null;

  let bestRound = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const bar of bars) {
    const rect = bar.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const distance = Math.abs(clientX - center);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestRound = Number(bar.dataset.round ?? 1);
    }
  }

  return bestRound;
}

export function RoundProbabilityBars({
  roundProbs,
  overallProbability,
  fillRound,
  className,
}: RoundProbabilityBarsProps) {
  const barsRef = useRef<HTMLDivElement>(null);
  const [hoveredRound, setHoveredRound] = useState<number | null>(null);

  const rounds = useMemo(() => {
    const next = roundProbs.slice(0, BAR_COUNT);
    while (next.length < BAR_COUNT) {
      next.push(next.at(-1) ?? 0);
    }
    return next;
  }, [roundProbs]);

  const overallPct = toPercent(overallProbability);
  const displayPct =
    hoveredRound === null
      ? overallPct
      : toPercent(rounds[hoveredRound - 1] ?? 0);

  // Freeze bars after each entrance so DOM moves never restart animation mid-flight.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when round data changes
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
  }, [rounds]);

  return (
    <fieldset
      className={cn("flex min-w-0 items-center gap-2 border-0 p-0", className)}
    >
      <legend className="sr-only">Admission chance by round</legend>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer hover between bar buttons */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard focus handled by bar buttons */}
      <div
        className="t-round-bars-track"
        onMouseMove={(event) => {
          const root = barsRef.current;
          if (!root) return;
          const round = roundAtPointer(root, event.clientX);
          if (round !== null) setHoveredRound(round);
        }}
        onMouseLeave={() => setHoveredRound(null)}
        onClick={(event) => event.stopPropagation()}
        onFocusCapture={(event) => {
          const hit = (event.target as HTMLElement).closest(".t-round-bar-hit");
          const round = hit?.getAttribute("data-round");
          if (round) setHoveredRound(Number(round));
        }}
        onBlurCapture={(event) => {
          if (!barsRef.current?.contains(event.relatedTarget as Node)) {
            setHoveredRound(null);
          }
        }}
      >
        <div
          ref={barsRef}
          className="t-round-bars flex items-end gap-[2px]"
          data-hovering={hoveredRound !== null ? "" : undefined}
        >
          {rounds.map((prob, index) => {
            const roundNum = index + 1;
            const clamped = clampProbability(prob);
            const band = classifyBand(clamped);
            const { color, label } = BAND_STYLES[band];
            const scale = Math.max(MIN_SCALE, clamped);
            const roundPct = toPercent(clamped);

            return (
              <button
                key={roundNum}
                type="button"
                className="t-round-bar-hit flex shrink-0 items-end justify-center"
                data-round={roundNum}
                data-active={hoveredRound === roundNum ? "" : undefined}
                aria-label={`Round ${roundNum}: ${roundPct}% (${label})`}
                onFocus={() => setHoveredRound(roundNum)}
                onClick={(event) => event.stopPropagation()}
              >
                <div
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
                />
              </button>
            );
          })}
        </div>
      </div>
      <span
        key={hoveredRound === null ? "avg" : `r${hoveredRound}-${displayPct}`}
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "t-round-chance w-10 shrink-0 text-right text-xs tabular-nums transition-colors duration-150 ease-out",
          hoveredRound === null ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {displayPct}%
      </span>
    </fieldset>
  );
}
