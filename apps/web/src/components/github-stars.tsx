"use client";

import { motion, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const COUNTDOWN_DURATION = 2000;
const SPRING = { stiffness: 100, damping: 30 };
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

export interface GitHubStarsProps {
  owner?: string;
  repo?: string;
  starCount?: number;
  className?: string;
  countClassName?: string;
}

export default function GitHubStars({
  owner = "su6u",
  repo = "ejam",
  starCount: providedStarCount,
  className = "",
  countClassName = "",
}: Readonly<GitHubStarsProps>) {
  const [starCount, setStarCount] = useState(providedStarCount ?? 0);
  const [displayCount, setDisplayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(!providedStarCount);
  const [error, setError] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const countSpring = useSpring(0, SPRING);

  useEffect(() => {
    if (providedStarCount !== undefined) {
      setStarCount(providedStarCount);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(false);
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          {
            headers: { Accept: "application/vnd.github.v3+json" },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setStarCount(data.stargazers_count ?? 0);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [owner, repo, providedStarCount]);

  useEffect(() => {
    if (starCount === 0 || shouldReduceMotion) {
      if (shouldReduceMotion) {
        setDisplayCount(starCount);
        countSpring.set(starCount);
      }
      return;
    }

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / COUNTDOWN_DURATION, 1);
      // cubic ease-out
      const eased = 1 - (1 - progress) ** 3;
      const current = Math.floor(starCount * eased);

      setDisplayCount(current);
      countSpring.set(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayCount(starCount);
        countSpring.set(starCount);
      }
    };

    animate();
  }, [starCount, countSpring, shouldReduceMotion]);

  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <Skeleton className="h-3 w-12 rounded-none bg-muted-foreground/40" />
      </div>
    );
  }

  if (error && starCount === 0) return null;

  return (
    <div className={`flex items-center ${className}`}>
      <motion.div
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        className={`flex items-center gap-1.5 font-medium ${countClassName}`}
        initial={
          shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.3, ease: EASE_OUT_CUBIC }
        }
      >
        {/* tabular-nums prevents layout shift as the count animates */}
        <motion.span
          animate={shouldReduceMotion ? { scale: 1 } : { scale: [1, 1.1, 1] }}
          className="tabular-nums"
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.3, ease: EASE_OUT_CUBIC }
          }
        >
          {displayCount.toLocaleString()}
        </motion.span>
        <span
          className="text-sm font-normal"
          style={{ color: "oklch(55% 0.005 260)" }}
        >
          stars
        </span>
      </motion.div>
    </div>
  );
}
