"use client";

import Image from "next/image";
import Link from "next/link";
import { useFolderShake } from "@/hooks/use-folder-shake";
import type { ToolCatalogEntry } from "@/lib/tools-catalog";
import { pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

const FOLDER_IMAGE = "/media/folder.png";

export function ToolFolderCard({
  tool,
  onMouseEnter,
  onPointerDown,
}: {
  tool: ToolCatalogEntry;
  onMouseEnter?: () => void;
  onPointerDown?: () => void;
}) {
  const isLive = tool.status === "live";
  const { cardRef, shake } = useFolderShake();

  const image = (
    <Image
      src={FOLDER_IMAGE}
      alt=""
      width={116}
      height={87}
      className={cn(
        "h-auto w-auto max-w-none select-none",
        isLive ? "home-folder-live-img" : "grayscale",
      )}
      style={{ width: "auto", height: "auto" }}
      aria-hidden
    />
  );

  const label = (
    <p className="truncate font-instrument-sans text-[11px] font-medium leading-tight tracking-[-0.01em] text-[#2e2e2e]">
      {tool.title}
    </p>
  );

  return (
    <div
      ref={cardRef}
      className={cn(
        "home-folder-card group/tool-folder flex w-[7.25rem] shrink-0 flex-col gap-0.5",
        !isLive && "opacity-50",
      )}
    >
      {isLive ? (
        <Link
          href={tool.href}
          onMouseEnter={onMouseEnter}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            onPointerDown?.();
          }}
          aria-label={tool.title}
          className={cn(
            "flex flex-col gap-0.5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e2e2e]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6FBFF]",
            pressableClass,
          )}
        >
          {image}
          {label}
        </Link>
      ) : (
        <button
          type="button"
          onMouseEnter={onMouseEnter}
          onClick={() => shake()}
          aria-label={`${tool.title} (coming soon)`}
          className="flex w-full cursor-default flex-col gap-0.5 text-left"
        >
          {image}
          {label}
        </button>
      )}
    </div>
  );
}
