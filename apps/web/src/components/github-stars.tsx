"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const COUNTDOWN_DURATION = 700;
const STAR_REVEAL_TRANSITION = {
  type: "spring" as const,
  duration: 0.3,
  bounce: 0,
};
const CACHE_KEY = "github-stars:su6u/ejam";
const FALLBACK_SIZER = 99;

export interface GitHubStarsProps {
  owner?: string;
  repo?: string;
  starCount?: number;
  className?: string;
  countClassName?: string;
}

function readCachedCount(): number | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedCount(count: number): void {
  try {
    sessionStorage.setItem(CACHE_KEY, String(count));
  } catch {
    // ignore quota errors
  }
}

export default function GitHubStars({
  owner = "su6u",
  repo = "ejam",
  starCount: providedStarCount,
  className = "",
  countClassName = "",
}: Readonly<GitHubStarsProps>) {
  const hasProvidedCount = providedStarCount !== undefined;

  const [starCount, setStarCount] = useState(providedStarCount ?? 0);
  const [displayCount, setDisplayCount] = useState(
    hasProvidedCount ? (providedStarCount ?? 0) : 0,
  );
  const [isLoading, setIsLoading] = useState(!hasProvidedCount);
  const [error, setError] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const rafIdRef = useRef<number | null>(null);
  const hadCacheRef = useRef(false);

  useLayoutEffect(() => {
    if (hasProvidedCount) return;

    const cached = readCachedCount();
    if (cached === null) return;

    hadCacheRef.current = true;
    setStarCount(cached);
    setIsLoading(false);
  }, [hasProvidedCount]);

  useEffect(() => {
    if (hasProvidedCount) return;

    const fetchData = async () => {
      try {
        if (!hadCacheRef.current) {
          setIsLoading(true);
        }
        setError(false);
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          {
            headers: { Accept: "application/vnd.github.v3+json" },
          },
        );
        if (res.ok) {
          const data = await res.json();
          const next = data.stargazers_count ?? 0;
          setStarCount(next);
          writeCachedCount(next);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [owner, repo, hasProvidedCount]);

  useEffect(() => {
    if (isLoading || starCount === 0 || shouldReduceMotion) {
      if (!isLoading && shouldReduceMotion) {
        setDisplayCount(starCount);
      }
      return;
    }

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / COUNTDOWN_DURATION, 1);
      const eased = 1 - (1 - progress) ** 3;
      const current = Math.round(starCount * eased);

      setDisplayCount(current);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
        setDisplayCount(starCount);
      }
    };

    animate();

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isLoading, starCount, shouldReduceMotion]);

  if (error && starCount === 0) return null;

  const sizerLabel = `${FALLBACK_SIZER.toLocaleString()} stars`;

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <span
        className={cn(
          "invisible whitespace-nowrap text-xs tabular-nums",
          countClassName,
        )}
        aria-hidden
      >
        {sizerLabel}
      </span>

      {isLoading ? (
        <Skeleton className="absolute inset-0 rounded-none bg-muted-foreground/40" />
      ) : (
        <motion.span
          animate={
            shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
          }
          className={cn(
            "absolute inset-0 flex items-center gap-1.5 whitespace-nowrap text-xs font-medium tabular-nums",
            countClassName,
          )}
          initial={
            shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }
          }
          transition={
            shouldReduceMotion ? { duration: 0 } : STAR_REVEAL_TRANSITION
          }
        >
          <span>{displayCount.toLocaleString()}</span>
          <span className="font-normal text-muted-foreground">stars</span>
        </motion.span>
      )}
    </span>
  );
}
