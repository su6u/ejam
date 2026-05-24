import { cn } from "@/lib/utils";

export const pressableClass = "pressable";

/** shadcn Button — skip scale on popup triggers (aria-haspopup). */
export const buttonPressableClass = "pressable pressable-button";

export const headerPillClass = cn(
  "inline-flex h-9 items-center gap-2 rounded-none border border-border bg-background px-3 text-xs font-medium text-foreground shadow-none",
  pressableClass,
  "hover:bg-muted hover:opacity-90",
);

/** Run click work after the press animation paints (double rAF). */
export function deferAfterPress(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}
