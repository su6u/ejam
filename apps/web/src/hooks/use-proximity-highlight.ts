"use client";

import { useCallback, useEffect, useRef } from "react";

const PROXIMITY_EASE_IN = "cubic-bezier(0.22, 1, 0.36, 1)";
const PROXIMITY_EASE_OUT = "ease-out";
const PROXIMITY_DUR_MS = 150;

export function useProximityHighlight(itemSelector = ".t-proximity-item") {
  const rootRef = useRef<HTMLDivElement>(null);

  const setProximity = useCallback(
    (activeIdx: number | null, phase: "in" | "out") => {
      const root = rootRef.current;
      if (!root) return;

      const timing = phase === "out" ? PROXIMITY_EASE_OUT : PROXIMITY_EASE_IN;
      const transition = `background-color ${PROXIMITY_DUR_MS}ms ${timing}, opacity ${PROXIMITY_DUR_MS}ms ${timing}`;

      root.querySelectorAll<HTMLElement>(itemSelector).forEach((el, i) => {
        const link = el.querySelector<HTMLElement>(".home-header-link");
        const target = link ?? el;
        target.style.transition = transition;

        const strength = activeIdx === null ? 0 : i === activeIdx ? 1 : 0;
        el.style.setProperty("--proximity", String(strength));
      });
    },
    [itemSelector],
  );

  const onItemEnter = useCallback(
    (index: number) => setProximity(index, "in"),
    [setProximity],
  );

  const onGroupLeave = useCallback(
    () => setProximity(null, "out"),
    [setProximity],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.addEventListener("mouseleave", onGroupLeave);
    return () => root.removeEventListener("mouseleave", onGroupLeave);
  }, [onGroupLeave]);

  return { rootRef, onItemEnter, onGroupLeave };
}
