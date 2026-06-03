"use client";

import { useCallback, useEffect, useRef } from "react";

function readMotionMs(name: string, fallback: number): number {
  const value = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : fallback;
}

export function useFolderShake() {
  const cardRef = useRef<HTMLDivElement>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shake = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    card.classList.remove("is-shaking");
    void card.offsetWidth;
    card.classList.add("is-shaking");

    const shakeMs =
      readMotionMs("--shake-dur-a", 80) * 2 +
      readMotionMs("--shake-dur-b", 60) * 2;

    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => {
      card.classList.remove("is-shaking");
      shakeTimerRef.current = null;
    }, shakeMs + 20);
  }, []);

  useEffect(
    () => () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    },
    [],
  );

  return { cardRef, shake };
}
