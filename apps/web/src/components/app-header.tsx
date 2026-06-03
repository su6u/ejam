"use client";

import Image from "next/image";
import Link from "next/link";
import type { RefObject } from "react";
import GitHubStars from "@/components/github-stars";
import { useProximityHighlight } from "@/hooks/use-proximity-highlight";
import { headerPillClass, homeHeaderLinkClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

const SPONSOR_HREF = "https://github.com/sponsors/su6u";
const GITHUB_REPO_HREF = "https://github.com/su6u/ejam";

export function AppHeader({
  className,
  showToolsLink = false,
  variant = "default",
  docsHref,
}: {
  className?: string;
  showToolsLink?: boolean;
  variant?: "default" | "home";
  docsHref?: string;
}) {
  const isHome = variant === "home";
  const showDocs = Boolean(docsHref);
  const { rootRef, onItemEnter } = useProximityHighlight();
  const actionClass = isHome ? homeHeaderLinkClass : headerPillClass;
  const homeIconClass = "shrink-0";
  const toolHeaderIconClass = "size-4 shrink-0 brightness-0 invert";

  if (!isHome) {
    return (
      <header
        className={cn(
          "flex shrink-0 items-center justify-end gap-2",
          className,
        )}
      >
        {showToolsLink ? (
          <Link href="/" className={actionClass}>
            <Image
              src="/icons/tools.svg"
              alt=""
              width={16}
              height={16}
              aria-hidden
              className={toolHeaderIconClass}
            />
            Tools
          </Link>
        ) : null}
        {showDocs ? (
          <a
            href={docsHref}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
            aria-label="Documentation"
          >
            <Image
              src="/icons/docs.svg"
              alt=""
              width={16}
              height={16}
              aria-hidden
              className={toolHeaderIconClass}
            />
            Docs
          </a>
        ) : (
          <a
            href={SPONSOR_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
          >
            <Image
              src="/icons/heart.svg"
              alt=""
              width={16}
              height={16}
              aria-hidden
              className={toolHeaderIconClass}
            />
            Sponsor
          </a>
        )}
        <a
          href={GITHUB_REPO_HREF}
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
            className={toolHeaderIconClass}
          />
          <GitHubStars
            className="text-xs"
            countClassName="text-xs font-medium"
          />
        </a>
      </header>
    );
  }

  const secondaryIndex = showToolsLink ? 1 : 0;
  const githubIndex = secondaryIndex + 1;

  return (
    <header className={cn("flex shrink-0 items-center justify-end", className)}>
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
              <Image
                src="/icons/tools.svg"
                alt=""
                width={16}
                height={16}
                aria-hidden
                className={cn("size-4", homeIconClass)}
              />
              Tools
            </Link>
          </div>
        ) : null}
        <div className="t-proximity-item">
          <a
            href={SPONSOR_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
            onMouseEnter={() => onItemEnter(secondaryIndex)}
          >
            <Image
              src="/icons/heart.svg"
              alt=""
              width={16}
              height={16}
              aria-hidden
              className={cn("size-4", homeIconClass)}
            />
            Sponsor
          </a>
        </div>
        <div className="t-proximity-item">
          <a
            href={GITHUB_REPO_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
            onMouseEnter={() => onItemEnter(githubIndex)}
          >
            <Image
              src="/icons/github.svg"
              alt=""
              width={16}
              height={16}
              aria-hidden
              className={cn("size-4", homeIconClass)}
            />
            <GitHubStars
              className="text-[14px]"
              countClassName="text-[14px] font-medium tabular-nums text-[#2e2e2e]"
              starsLabelClassName="font-normal text-[#2e2e2e]/55"
              skeletonClassName="bg-[#2e2e2e]/12"
            />
          </a>
        </div>
      </div>
    </header>
  );
}
