import { cn } from "@/lib/utils";

export const pressableClass = "pressable";

/** Skip press scale on popup triggers (aria-haspopup). */
export const buttonPressableClass = "pressable pressable-button";

export const headerPillClass = cn(
  "inline-flex h-9 items-center gap-2 rounded-none bg-background pl-2.5 pr-3 text-xs font-medium text-foreground",
  "shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 ease-out hover:shadow-[var(--shadow-border-hover)]",
  pressableClass,
  "hover:bg-muted",
);

export const homeHeaderLinkClass = cn(
  "relative inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FDFDFD] pl-2.5 pr-3 text-xs font-medium text-[#2e2e2e]",
  "after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']",
  pressableClass,
);

/** Run click work after the press animation paints (double rAF). */
export function deferAfterPress(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}
