"use client";

import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import {
  Suspense,
  use,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const COUNTDOWN_DURATION = 700;
const STAR_REVEAL_TRANSITION = {
  type: "spring" as const,
  duration: 0.3,
  bounce: 0,
};
const FALLBACK_SIZER = 99;

export interface GitHubStarsProps {
  owner?: string;
  repo?: string;
  starCount?: number;
  className?: string;
  countClassName?: string;
}

function cacheKey(owner: string, repo: string) {
  return `github-stars:${owner}/${repo}`;
}

function readCachedCount(owner: string, repo: string): number | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(owner, repo));
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedCount(owner: string, repo: string, count: number): void {
  try {
    sessionStorage.setItem(cacheKey(owner, repo), String(count));
  } catch {
    // ignore quota errors
  }
}

const starCountPromises = new Map<string, Promise<number>>();

function fetchGitHubStarCount(owner: string, repo: string): Promise<number> {
  const key = cacheKey(owner, repo);
  const cached = readCachedCount(owner, repo);
  if (cached !== null) return Promise.resolve(cached);

  const inflight = starCountPromises.get(key);
  if (inflight) return inflight;

  const promise = fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("github stars fetch failed");
      const data = await res.json();
      const next = data.stargazers_count ?? 0;
      writeCachedCount(owner, repo, next);
      return next;
    })
    .catch(() => readCachedCount(owner, repo) ?? 0)
    .finally(() => {
      starCountPromises.delete(key);
    });

  starCountPromises.set(key, promise);
  return promise;
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

function GitHubStarsResolved({
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
  const starCount = use(fetchGitHubStarCount(owner, repo));
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
  const cached = readCachedCount(owner, repo);

  return (
    <Suspense
      fallback={
        <GitHubStarsDisplay
          isLoading={cached === null}
          displayCount={cached ?? 0}
          className={className}
          countClassName={countClassName}
          shouldReduceMotion={false}
        />
      }
    >
      <GitHubStarsResolved
        owner={owner}
        repo={repo}
        className={className}
        countClassName={countClassName}
      />
    </Suspense>
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
