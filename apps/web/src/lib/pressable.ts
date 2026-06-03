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

/** Homepage header pills — slightly compact on light hero */
export const homeHeaderPillClass = cn(
  "inline-flex h-9 items-center gap-1.5 rounded-none bg-[#2e2e2e] pl-2.5 pr-3 text-xs font-medium text-white",
  "shadow-[0_1px_2px_rgb(46_46_46_/_0.14),0_0_0_1px_rgb(0_0_0_/_0.06)]",
  "transition-[box-shadow,background-color] duration-150 ease-out",
  "hover:shadow-[0_2px_6px_rgb(46_46_46_/_0.18),0_0_0_1px_rgb(0_0_0_/_0.08)]",
  pressableClass,
  "hover:bg-[#2e2e2e]/92",
);

/** Run click work after the press animation paints (double rAF). */
export function deferAfterPress(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}
