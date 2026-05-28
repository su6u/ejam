"use client";

import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
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

function cancelCountAnimation(rafIdRef: RefObject<number | null>) {
  if (rafIdRef.current !== null) {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
  }
}

function animateDisplayCount(
  starCount: number,
  shouldReduceMotion: boolean | null,
  rafIdRef: RefObject<number | null>,
  setDisplayCount: (count: number) => void,
) {
  cancelCountAnimation(rafIdRef);

  if (starCount === 0 || shouldReduceMotion) {
    setDisplayCount(starCount);
    return;
  }

  const startTime = performance.now();

  const run = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / COUNTDOWN_DURATION, 1);
    const eased = 1 - (1 - progress) ** 3;
    setDisplayCount(Math.round(starCount * eased));

    if (progress < 1) {
      rafIdRef.current = requestAnimationFrame(run);
    } else {
      rafIdRef.current = null;
      setDisplayCount(starCount);
    }
  };

  run();
}

function GitHubStarsDisplay({
  isLoading,
  displayCount,
  className,
  countClassName,
  shouldReduceMotion,
}: {
  isLoading: boolean;
  displayCount: number;
  className: string;
  countClassName: string;
  shouldReduceMotion: boolean | null;
}) {
  const sizerLabel = `${FALLBACK_SIZER.toLocaleString()} stars`;

  return (
    <LazyMotion features={domAnimation} strict>
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
          <m.span
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
          </m.span>
        )}
      </span>
    </LazyMotion>
  );
}

function GitHubStarsProvided({
  starCount,
  className,
  countClassName,
}: {
  starCount: number;
  className: string;
  countClassName: string;
}) {
  const [displayCount, setDisplayCount] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const rafIdRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    animateDisplayCount(
      starCount,
      shouldReduceMotion,
      rafIdRef,
      setDisplayCount,
    );
    return () => cancelCountAnimation(rafIdRef);
  }, [starCount, shouldReduceMotion]);

  return (
    <GitHubStarsDisplay
      isLoading={false}
      displayCount={displayCount}
      className={className}
      countClassName={countClassName}
      shouldReduceMotion={shouldReduceMotion}
    />
  );
}

function GitHubStarsFetched({
  owner,
  repo,
  className,
  countClassName,
}: {
  owner: string;
  repo: string;
  className: string;
  countClassName: string;
}) {
  const [starCount, setStarCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const rafIdRef = useRef<number | null>(null);
  const hadCacheRef = useRef(false);

  useLayoutEffect(() => {
    const cached = readCachedCount();
    if (cached === null) return;

    hadCacheRef.current = true;
    setStarCount(cached);
    setIsLoading(false);
    animateDisplayCount(cached, shouldReduceMotion, rafIdRef, setDisplayCount);
  }, [shouldReduceMotion]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        if (!hadCacheRef.current && !cancelled) {
          setIsLoading(true);
        }
        if (!cancelled) setError(false);

        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          {
            headers: { Accept: "application/vnd.github.v3+json" },
          },
        );

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          const next = data.stargazers_count ?? 0;
          setStarCount(next);
          writeCachedCount(next);
          animateDisplayCount(
            next,
            shouldReduceMotion,
            rafIdRef,
            setDisplayCount,
          );
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [owner, repo, shouldReduceMotion]);

  useEffect(() => () => cancelCountAnimation(rafIdRef), []);

  if (error && starCount === 0) return null;

  return (
    <GitHubStarsDisplay
      isLoading={isLoading}
      displayCount={displayCount}
      className={className}
      countClassName={countClassName}
      shouldReduceMotion={shouldReduceMotion}
    />
  );
}

export default function GitHubStars({
  owner = "su6u",
  repo = "ejam",
  starCount: providedStarCount,
  className = "",
  countClassName = "",
}: Readonly<GitHubStarsProps>) {
  if (providedStarCount !== undefined) {
    return (
      <GitHubStarsProvided
        starCount={providedStarCount}
        className={className}
        countClassName={countClassName}
      />
    );
  }

  return (
    <GitHubStarsFetched
      owner={owner}
      repo={repo}
      className={className}
      countClassName={countClassName}
    />
  );
}
