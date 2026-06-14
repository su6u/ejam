import type * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  homeCardPillDisabledClass,
} from "@/lib/pressable";

export interface ToolCardItem {
  name?: string;
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
            ? "relative flex h-36 w-full flex-col overflow-hidden rounded-lg border sm:h-40"
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
                  className="size-3 shrink-0"
                />
                {item.pill.label}
              </>
            );
            if (pillOnlyLink && item.href && renderPillLink) {
              return renderPillLink(item.href, pillContent);
            }
            const pillDisabled = !item.href;
            return (
              <span
                className={cn(
                  pillDisabled
                    ? homeCardPillDisabledClass
                    : "absolute right-2.5 bottom-4 z-10 inline-flex h-7 items-center gap-1 rounded-full bg-[#FDFDFD] pl-2 pr-2.5 text-[11px] font-medium leading-none text-[#2e2e2e]",
                )}
                aria-disabled={pillDisabled || undefined}
              >
                {pillContent}
              </span>
            );
          })()
        ) : null}

        <div
          className={cn(
            compact
              ? "relative flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 pt-2.5 pb-0"
              : "relative flex flex-1 flex-col gap-3 px-5 pt-6 pb-4",
            item.containerClassName,
          )}
        >
          {item.name || item.breadcrumb ? (
            <div
              className={cn(
                "relative z-10 flex gap-1",
                compact
                  ? "items-baseline justify-between"
                  : "flex-col items-start gap-0.5",
              )}
            >
              {item.name ? (
                <span
                  className={cn(
                    "font-instrument-sans leading-tight",
                    compact
                      ? "min-w-0 truncate text-[11px] font-medium tracking-tight sm:text-sm"
                      : "shrink-0 text-xl font-medium tracking-tight",
                    item.soon ? "text-muted-foreground/80" : "text-foreground",
                  )}
                >
                  {item.name}
                </span>
              ) : null}
              {compact && item.breadcrumb ? (
                <span className="shrink-0 text-right font-instrument-sans text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
                  {item.breadcrumb}
                </span>
              ) : null}
            </div>
          ) : null}

          {compact && item.img ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-start pl-0.5 md:pl-1">
              <img
                src={item.img}
                alt=""
                width={item.imgWidth ?? 200}
                height={140}
                className={cn(
                  "block h-auto w-[62%] max-w-[4.5rem] object-contain object-bottom sm:max-w-[5rem]",
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
      {items.map((item, index) => (
        <ToolCard
          key={item.name ?? `tool-card-${index}`}
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
