"use client";

import { deferAfterPress, pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

export function ChipIcon({
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
  slidingCols,
  slidingRows = 1,
  slidingIndex,
}: {
  label: string;
  iconSrc?: string;
  children: React.ReactNode;
  vertical?: boolean;
  grid?: 2;
  slidingCols?: 2 | 3 | 4;
  slidingRows?: 1 | 2;
  /** Index of the active chip for the sliding outline. */
  slidingIndex?: number | null;
}) {
  const cols = slidingCols ?? (vertical && grid === 2 ? 2 : undefined);
  const rows = slidingCols == null && vertical && grid === 2 ? 2 : slidingRows;
  const useSlidingGrid = cols != null;

  const gapToken = cols === 4 || rows === 2 ? "15" : cols === 2 && !vertical ? "2" : "1";

  return (
    <div
      className={cn(
        "flex gap-1.5",
        vertical ? "flex-col items-stretch" : "items-center",
        cols === 4 && !vertical && "w-full",
      )}
    >
      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {iconSrc ? <ChipIcon src={iconSrc} className="size-2.5" /> : null}
        {label}
      </span>
      {useSlidingGrid ? (
        <div
          className={cn(
            "sliding-toggle-track",
            cols === 4 && !vertical && "min-w-0 flex-1",
            vertical && "w-full",
          )}
          data-gap={gapToken}
          data-rows={rows === 2 ? "2" : undefined}
        >
          {slidingIndex != null && slidingIndex >= 0 ? (
            <span
              aria-hidden
              className="sliding-toggle-indicator"
              data-cols={String(cols)}
              data-gap={gapToken}
              data-rows={rows === 2 ? "2" : undefined}
              data-index={String(slidingIndex)}
            />
          ) : null}
          <div
            className={cn(
              "sliding-toggle-grid grid",
              cols === 2 && "grid-cols-2",
              cols === 3 && "grid-cols-3",
              cols === 4 && "grid-cols-4",
            )}
          >
            {children}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            vertical && !grid && "flex w-full flex-wrap",
            !vertical && "flex flex-wrap items-center",
            vertical && grid && "grid grid-cols-2 gap-1.5",
          )}
        >
          {children}
        </div>
      )}
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
  instant,
  onClick,
  className,
}: {
  label: string;
  iconSrc?: string;
  active: boolean;
  disabled?: boolean;
  accentColor?: string;
  fullWidth?: boolean;
  /** Skip double-rAF defer */
  instant?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => (instant ? onClick() : deferAfterPress(onClick))}
      className={cn(
        "filter-chip sliding-toggle-tile inline-flex h-8 items-center rounded-none px-2.5 text-xs font-medium text-muted-foreground outline-none",
        pressableClass,
        "hover:text-foreground",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        active && "text-foreground",
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
      <span className="truncate">{label}</span>
    </button>
  );
}
