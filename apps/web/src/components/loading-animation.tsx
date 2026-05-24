"use client";

import Lottie from "lottie-react";
import { useReducedMotion } from "motion/react";
import loadAnimation from "@/public/assets/load.json";
import { cn } from "@/lib/utils";

interface LoadingAnimationProps {
  className?: string;
  /** pause loop when user prefers reduced motion */
  respectReducedMotion?: boolean;
}

export function LoadingAnimation({
  className,
  respectReducedMotion = true,
}: LoadingAnimationProps) {
  const shouldReduceMotion = useReducedMotion();
  const paused = respectReducedMotion && shouldReduceMotion;

  if (paused) {
    return (
      <div
        className={cn("size-6 rounded-none bg-muted-foreground/25", className)}
        aria-hidden
      />
    );
  }

  return (
    <Lottie
      animationData={loadAnimation}
      loop
      aria-hidden
      className={cn(
        "size-6 shrink-0 invert dark:invert-0",
        className,
      )}
    />
  );
}
