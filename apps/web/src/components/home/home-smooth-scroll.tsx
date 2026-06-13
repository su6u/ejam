"use client";

import Lenis from "lenis";
import { useEffect } from "react";

export function HomeSmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });

    let frameId = 0;
    const onFrame = (time: number) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(onFrame);
    };
    frameId = requestAnimationFrame(onFrame);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);

  return children;
}
