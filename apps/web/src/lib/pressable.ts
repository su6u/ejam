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

/**
 * Homepage header links — icon + label on light hero (#F6FBFF).
 * `after` extends tap target to ~40px. Proximity hover in `.home-header-proximity` (globals.css).
 */
export const homeHeaderLinkClass = cn(
  "home-header-link relative inline-flex min-h-11 items-center gap-2 rounded-none px-2.5 text-[14px] font-medium text-[#2e2e2e]",
  "after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']",
  pressableClass,
);

/** Run click work after the press animation paints (double rAF). */
export function deferAfterPress(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}
