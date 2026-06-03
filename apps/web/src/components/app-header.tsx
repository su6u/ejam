"use client";

import { LayoutGridIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RefObject } from "react";
import GitHubStars from "@/components/github-stars";
import { useProximityHighlight } from "@/hooks/use-proximity-highlight";
import {
  headerPillClass,
  homeHeaderLinkClass,
} from "@/lib/pressable";
import { cn } from "@/lib/utils";

export function AppHeader({
  className,
  showToolsLink = false,
  variant = "default",
}: {
  className?: string;
  showToolsLink?: boolean;
  variant?: "default" | "home";
}) {
  const isHome = variant === "home";
  const { rootRef, onItemEnter } = useProximityHighlight();
  const actionClass = isHome ? homeHeaderLinkClass : headerPillClass;
  const homeIconClass = "shrink-0";

  if (!isHome) {
    return (
      <header
        className={cn("flex shrink-0 items-center justify-end gap-2", className)}
      >
        {showToolsLink ? (
          <Link href="/" className={actionClass}>
            <LayoutGridIcon aria-hidden className="size-4 shrink-0" />
            Tools
          </Link>
        ) : null}
        <a
          href="https://github.com/su6u/ejam#readme"
          target="_blank"
          rel="noopener noreferrer"
          className={actionClass}
          aria-label="Documentation"
        >
          <Image
            src="/icons/docs.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden
            className="size-5 shrink-0"
          />
          Docs
        </a>
        <a
          href="https://github.com/su6u/ejam"
          target="_blank"
          rel="noopener noreferrer"
          className={actionClass}
        >
          <Image
            src="/icons/github.svg"
            alt=""
            width={16}
            height={16}
            aria-hidden
            className="size-4 shrink-0"
          />
          <GitHubStars className="text-xs" countClassName="text-xs font-medium" />
        </a>
      </header>
    );
  }

  const docsIndex = showToolsLink ? 1 : 0;
  const githubIndex = showToolsLink ? 2 : 1;

  return (
    <header
      className={cn("flex shrink-0 items-center justify-end", className)}
    >
      <div
        ref={rootRef as unknown as RefObject<HTMLDivElement>}
        className="home-header-proximity flex items-center gap-4 md:gap-5"
      >
        {showToolsLink ? (
          <div className="t-proximity-item">
            <Link
              href="/"
              className={actionClass}
              onMouseEnter={() => onItemEnter(0)}
            >
              <LayoutGridIcon aria-hidden className="size-4 shrink-0" />
              Tools
            </Link>
          </div>
        ) : null}
        <div className="t-proximity-item">
          <a
            href="https://github.com/su6u/ejam#readme"
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
            aria-label="Documentation"
            onMouseEnter={() => onItemEnter(docsIndex)}
          >
            <Image
              src="/icons/docs.svg"
              alt=""
              width={16}
              height={16}
              aria-hidden
              className={cn("size-4", homeIconClass)}
            />
            Docs
          </a>
        </div>
        <div className="t-proximity-item">
          <a
            href="https://github.com/su6u/ejam"
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
            onMouseEnter={() => onItemEnter(githubIndex)}
          >
            <Image
              src="/icons/github.svg"
              alt=""
              width={14}
              height={14}
              aria-hidden
              className={cn("size-3.5", homeIconClass)}
            />
            <GitHubStars
              className="text-[13px]"
              countClassName="text-[13px] font-medium text-[#2e2e2e]"
              starsLabelClassName="font-normal text-[#2e2e2e]/55"
              skeletonClassName="bg-[#2e2e2e]/12"
            />
          </a>
        </div>
      </div>
    </header>
  );
}
