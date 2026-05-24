"use client";

import type { LucideIcon } from "lucide-react";
import { deferAfterPress, pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

export function FilterGroup({
  label,
  children,
  vertical,
  grid,
}: {
  label: string;
  children: React.ReactNode;
  vertical?: boolean;
  grid?: 2;
}) {
  return (
    <div
      className={cn(
        "flex gap-1.5",
        vertical ? "flex-col items-stretch" : "flex-wrap items-center",
      )}
    >
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div
        className={cn(
          "gap-1.5",
          vertical && grid === 2 && "grid grid-cols-2",
          vertical && !grid && "flex w-full flex-wrap",
          !vertical && "flex flex-wrap items-center",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function FilterChip({
  label,
  icon: Icon,
  active,
  disabled,
  accentColor,
  fullWidth,
  onClick,
  className,
}: {
  label: string;
  icon?: LucideIcon;
  active: boolean;
  disabled?: boolean;
  accentColor?: string;
  fullWidth?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => deferAfterPress(onClick)}
      className={cn(
        "inline-flex h-8 items-center rounded-none border border-border bg-transparent px-2.5 text-xs font-medium text-muted-foreground outline-none",
        pressableClass,
        "hover:text-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        active && "border-foreground/40 text-foreground",
        fullWidth && "w-full justify-start",
        Icon && "gap-1.5",
        className,
      )}
      style={
        active && accentColor
          ? {
              color: accentColor,
              borderColor: `color-mix(in srgb, ${accentColor} 45%, var(--border))`,
              backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
            }
          : undefined
      }
    >
      {Icon ? (
        <Icon
          className="size-3 shrink-0"
          aria-hidden
          style={active && accentColor ? { color: accentColor } : undefined}
        />
      ) : null}
      {label}
    </button>
  );
}
