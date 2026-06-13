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

/** White pill — header actions and home tool card CTA share one surface. */
export const homePillClass = cn(
  "relative inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FDFDFD] pl-2 pr-3 text-xs font-medium text-[#2e2e2e]",
  "shadow-[0_0_0_1px_rgb(0_0_0_/0.08)] transition-[box-shadow] duration-150 ease-out",
  "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
  pressableClass,
  "[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_2px_10px_rgb(0_0_0_/0.18)]",
);

export const homeHeaderLinkClass = homePillClass;

export const homeCardPillClass = cn(
  homePillClass,
  "absolute right-5 bottom-4 z-10 md:right-6 md:bottom-5",
);

/** Run click work after the press animation paints (double rAF). */
export function deferAfterPress(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}
