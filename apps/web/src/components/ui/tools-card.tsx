import type * as React from "react";
import { cn } from "@/lib/utils";

export interface ToolCardItem {
  name: string;
  description?: string;
  href?: string;
  img?: string;
  imgLight?: string;
  imgClassName?: string;
  imgWidth?: number;
  containerClassName?: string;
  cardClassName?: string;
  cardStyle?: React.CSSProperties;
  fadeBottom?: boolean;
  soon?: boolean;
}

export interface ToolCardGridProps {
  items: ToolCardItem[];
  className?: string;
  compact?: boolean;
  renderLink?: (href: string, children: React.ReactNode) => React.ReactNode;
}

function ToolCard({
  item,
  renderLink,
  compact,
}: {
  item: ToolCardItem;
  renderLink?: ToolCardGridProps["renderLink"];
  compact?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "relative flex w-full flex-col",
        item.soon
          ? "cursor-not-allowed opacity-80"
          : item.href
            ? "cursor-pointer"
            : "",
      )}
    >
      <div
        style={item.cardStyle}
        className={cn(
          compact
            ? "flex h-52 w-full flex-col overflow-hidden rounded-2xl border transition-colors md:h-56"
            : "flex h-80 w-full flex-col overflow-hidden rounded-3xl border transition-colors md:h-96",
          item.cardClassName ?? "bg-card",
          item.soon ? "border-dashed border-border" : "border-border",
        )}
      >
        {item.soon && (
          <span className="absolute top-3 right-3 z-10 rounded-full border bg-card px-2 py-1 text-xs text-muted-foreground">
            Coming soon
          </span>
        )}

        <div
          className={cn(
            compact
              ? "relative flex flex-1 flex-col gap-2 px-3 pt-4 pb-3"
              : "relative flex flex-1 flex-col gap-3 px-5 pt-6 pb-4",
            item.containerClassName,
          )}
        >
          {item.name && (
            <span
              className={cn(
                "font-instrument-sans",
                compact
                  ? "text-sm font-medium tracking-tight md:text-base"
                  : "text-xl font-medium tracking-tight",
                item.soon ? "text-muted-foreground/80" : "text-foreground",
              )}
            >
              {item.name}
            </span>
          )}

          {item.img && (
            <img
              src={item.img}
              alt=""
              width={item.imgWidth ?? 200}
              height={200}
              className={cn(
                "hidden h-auto outline outline-1 -outline-offset-1 outline-white/10 dark:block",
                item.imgClassName,
              )}
            />
          )}
          {(item.imgLight ?? item.img) && (
            <img
              src={item.imgLight ?? item.img}
              alt=""
              width={item.imgWidth ?? 200}
              height={200}
              className={cn(
                "h-auto outline outline-1 -outline-offset-1 outline-black/10 dark:hidden",
                item.imgClassName,
              )}
            />
          )}

          {item.fadeBottom && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-22 bg-gradient-to-t from-card to-transparent" />
          )}
        </div>
      </div>
    </div>
  );

  if (item.href && renderLink) {
    return renderLink(item.href, inner);
  }

  return inner;
}

function ToolCardGrid({
  items,
  className,
  compact,
  renderLink,
}: ToolCardGridProps) {
  return (
    <div className={cn("grid w-full grid-cols-1 gap-4", className)}>
      {items.map((item) => (
        <ToolCard
          key={item.name}
          item={item}
          compact={compact}
          renderLink={renderLink}
        />
      ))}
    </div>
  );
}

export { ToolCardGrid };
