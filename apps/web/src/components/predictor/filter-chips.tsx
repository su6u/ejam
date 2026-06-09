"use client";

import { deferAfterPress, pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

function ChipIcon({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={cn("size-3 shrink-0 bg-current", className)}
      style={{
        maskImage: `url(${src})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        ...style,
      }}
    />
  );
}

export function FilterGroup({
  label,
  iconSrc,
  children,
  vertical,
  grid,
}: {
  label: string;
  iconSrc?: string;
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
      <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {iconSrc ? <ChipIcon src={iconSrc} className="size-2.5" /> : null}
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
  iconSrc,
  active,
  disabled,
  accentColor,
  fullWidth,
  onClick,
  className,
}: {
  label: string;
  iconSrc?: string;
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
        iconSrc && "gap-1.5",
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
      {iconSrc ? (
        <ChipIcon
          src={iconSrc}
          style={active && accentColor ? { color: accentColor } : undefined}
        />
      ) : null}
      {label}
    </button>
  );
}
