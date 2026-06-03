"use client";

import type { RefObject } from "react";
import { primeClickSound, useClickSound } from "@/components/click-sound";
import { ToolFolderCard } from "@/components/home/tool-folder";
import { useAvatarGroupHover } from "@/hooks/use-avatar-group-hover";
import type { ToolCatalogEntry } from "@/lib/tools-catalog";

const FOLDER_ENTER_BASE_MS = 320;
const FOLDER_ENTER_STEP_MS = 50;

export function ToolFolderRow({
  tools,
}: {
  tools: readonly ToolCatalogEntry[];
}) {
  const { rootRef, onItemEnter } = useAvatarGroupHover();
  const playClickSound = useClickSound();

  return (
    <ul
      ref={rootRef as unknown as RefObject<HTMLUListElement>}
      className="t-avatar-group flex flex-wrap gap-6 md:gap-8"
    >
      {tools.map((tool, index) => (
        <li
          key={tool.id}
          className="home-folder-enter"
          style={{
            animationDelay: `${FOLDER_ENTER_BASE_MS + index * FOLDER_ENTER_STEP_MS}ms`,
          }}
        >
          <div className="t-avatar">
            <ToolFolderCard
              tool={tool}
              onMouseEnter={() => {
                onItemEnter(index);
                if (tool.status === "live") primeClickSound();
              }}
              onPointerDown={
                tool.status === "live" ? playClickSound : undefined
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
