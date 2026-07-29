"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { Button } from "@/components/ui/button";

/** Sentinel + status footer — pages load on scroll, not via Load more. */
export function ResultsScrollStatus({
  loaded,
  total,
  hasMore,
  loading,
  error,
  onLoadMore,
  scrollRootRef,
}: {
  loaded: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
  scrollRootRef: RefObject<HTMLElement | null>;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRootRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (!hasMore || loading || error) return;
        onLoadMore();
      },
      { root, rootMargin: "240px 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, hasMore, loading, onLoadMore, scrollRootRef]);

  return (
    <div className="flex min-h-10 flex-col items-center justify-center gap-2 px-4 py-3">
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <span className="sr-only" aria-live="polite">
        {loaded} of {total} programs shown
        {loading ? ", loading more" : ""}
      </span>
      {error ? (
        <div className="flex flex-col items-center gap-2">
          <p role="alert" className="text-center text-xs text-destructive">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            className="rounded-none border-border bg-transparent shadow-none transition-transform active:scale-[0.96]"
          >
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div
          role="status"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <LoaderCircle
            className="size-3.5 animate-spin"
            aria-hidden
          />
          Loading more…
        </div>
      ) : null}
    </div>
  );
}
