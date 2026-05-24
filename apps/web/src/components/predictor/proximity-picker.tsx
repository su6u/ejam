"use client";

import { ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProximityHover } from "@/hooks/use-proximity-hover";
import { deferAfterPress, pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

interface ProximityPickerOption {
  value: string;
  label: string;
}

interface ProximityPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<ProximityPickerOption>;
  placeholder?: string;
  triggerClassName?: string;
  listClassName?: string;
}

export function ProximityPicker({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  triggerClassName,
  listClassName,
}: ProximityPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex, itemRects, handlers, registerItem, measureItems } =
    useProximityHover(containerRef, { axis: "y" });

  useEffect(() => {
    if (open) measureItems();
  }, [open, measureItems]);

  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-none border border-input bg-transparent px-2.5 text-sm outline-none",
          pressableClass,
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          triggerClassName,
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDownIcon
          className="size-4 shrink-0 text-muted-foreground/80"
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-(--anchor-width) min-w-(--anchor-width) rounded-none p-1"
        align="start"
      >
        <div
          ref={containerRef}
          className={cn("relative flex flex-col", listClassName)}
          {...handlers}
        >
          {activeIndex !== null && itemRects[activeIndex] ? (
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 left-0 rounded-none bg-muted transition-transform duration-150 ease-out will-change-transform"
              style={{
                height: itemRects[activeIndex].height,
                transform: `translate3d(${itemRects[activeIndex].left}px, ${itemRects[activeIndex].top}px, 0)`,
                width: itemRects[activeIndex].width,
              }}
            />
          ) : null}
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHovered = activeIndex === index;

            return (
              <button
                key={option.value}
                ref={(element) => registerItem(index, element)}
                type="button"
                onClick={() => {
                  deferAfterPress(() => {
                    onValueChange(option.value);
                    setOpen(false);
                  });
                }}
                className={cn(
                  "relative z-10 flex h-8 w-full items-center rounded-none bg-transparent px-2 text-left text-sm outline-none",
                  pressableClass,
                  isSelected || isHovered
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
