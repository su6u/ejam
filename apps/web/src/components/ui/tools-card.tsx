import type * as React from "react";
import Image from "next/image";
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
  pill?: {
    label: string;
    iconSrc: string;
  };
  breadcrumb?: string;
}

export interface ToolCardGridProps {
  items: ToolCardItem[];
  className?: string;
  compact?: boolean;
  renderLink?: (href: string, children: React.ReactNode) => React.ReactNode;
  renderPillLink?: (href: string, children: React.ReactNode) => React.ReactNode;
}

function ToolCard({
  item,
  renderLink,
  renderPillLink,
  compact,
}: {
  item: ToolCardItem;
  renderLink?: ToolCardGridProps["renderLink"];
  renderPillLink?: ToolCardGridProps["renderPillLink"];
  compact?: boolean;
}) {
  const pillOnlyLink = Boolean(compact && item.pill && item.href && renderPillLink);

  const inner = (
    <div
      className={cn(
        "relative flex w-full flex-col",
        item.soon ? "cursor-not-allowed opacity-80" : "",
        !pillOnlyLink && item.href ? "cursor-pointer" : "",
      )}
    >
      <div
        style={item.cardStyle}
        className={cn(
          compact
            ? "relative flex h-52 w-full flex-col overflow-hidden rounded-2xl border md:h-56"
            : "relative flex h-80 w-full flex-col overflow-hidden rounded-3xl border md:h-96",
          item.cardClassName ?? "bg-card",
          item.soon ? "border-dashed border-border" : "border-border",
        )}
      >
        {item.soon && (
          <span className="absolute top-3 right-3 z-10 rounded-full border bg-card px-2 py-1 text-xs text-muted-foreground">
            Coming soon
          </span>
        )}

        {compact && item.pill ? (
          (() => {
            const pillContent = (
              <>
                <Image
                  src={item.pill.iconSrc}
                  alt=""
                  width={14}
                  height={14}
                  aria-hidden
                  className="size-3.5 shrink-0"
                />
                {item.pill.label}
              </>
            );
            if (pillOnlyLink && item.href && renderPillLink) {
              return renderPillLink(item.href, pillContent);
            }
            return (
              <span className="absolute right-5 bottom-4 z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FDFDFD] pl-2 pr-3 text-xs font-medium text-[#2e2e2e] md:right-6 md:bottom-5">
                {pillContent}
              </span>
            );
          })()
        ) : null}

        <div
          className={cn(
            compact
              ? "relative flex min-h-0 flex-1 flex-col overflow-hidden px-3 pt-4 pb-0 md:px-4"
              : "relative flex flex-1 flex-col gap-3 px-5 pt-6 pb-4",
            item.containerClassName,
          )}
        >
          {item.name || item.breadcrumb ? (
            <div className="relative z-10 flex items-baseline justify-between gap-3">
              {item.name ? (
                <span
                  className={cn(
                    "font-instrument-sans shrink-0",
                    compact
                      ? "text-sm font-medium tracking-tight md:text-base"
                      : "text-xl font-medium tracking-tight",
                    item.soon ? "text-muted-foreground/80" : "text-foreground",
                  )}
                >
                  {item.name}
                </span>
              ) : null}
              {compact && item.breadcrumb ? (
                <span className="shrink-0 font-instrument-sans text-xs text-muted-foreground">
                  {item.breadcrumb}
                </span>
              ) : null}
            </div>
          ) : null}

          {compact && item.img ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-start pl-1 md:pl-1.5">
              <img
                src={item.img}
                alt=""
                width={item.imgWidth ?? 200}
                height={140}
                className={cn(
                  "block h-auto w-[58%] max-w-[9rem] object-contain object-bottom md:max-w-[9.5rem]",
                  item.imgClassName,
                )}
              />
            </div>
          ) : null}

          {!compact && item.img && (
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
          {!compact && (item.imgLight ?? item.img) && (
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

  if (item.href && renderLink && !pillOnlyLink) {
    return renderLink(item.href, inner);
  }

  return inner;
}

function ToolCardGrid({
  items,
  className,
  compact,
  renderLink,
  renderPillLink,
}: ToolCardGridProps) {
  return (
    <div className={cn("grid w-full grid-cols-1 gap-4", className)}>
      {items.map((item) => (
        <ToolCard
          key={item.name}
          item={item}
          compact={compact}
          renderLink={renderLink}
          renderPillLink={renderPillLink}
        />
      ))}
    </div>
  );
}

export { ToolCardGrid };
