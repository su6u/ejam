"use client";

import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProximityHover } from "@/hooks/use-proximity-hover";
import { HOME_STATES, isHomeState } from "@/lib/home-states";
import { cn } from "@/lib/utils";

interface HomeStateComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function HomeStateCombobox({
  value,
  onValueChange,
  className,
}: HomeStateComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    activeIndex,
    itemRects,
    handlers,
    registerItem,
    measureItems,
  } = useProximityHover(containerRef, { axis: "y" });

  const filteredStates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return HOME_STATES;
    return HOME_STATES.filter((state) => state.toLowerCase().includes(query));
  }, [search]);

  useEffect(() => {
    if (open) measureItems();
  }, [open, filteredStates.length, measureItems]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        role="combobox"
        aria-expanded={open}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-none border border-input bg-transparent px-2.5 text-sm outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        {value && isHomeState(value) ? (
          <span className="truncate">{value}</span>
        ) : (
          <span className="text-muted-foreground">Select home state</span>
        )}
        <ChevronDownIcon
          className="size-4 shrink-0 text-muted-foreground/80"
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-(--anchor-width) min-w-(--anchor-width) rounded-none p-0"
        align="start"
      >
        <div className="flex items-center border-b border-border px-3">
          <SearchIcon className="mr-2 size-4 shrink-0 opacity-50" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search state…"
            className="flex h-9 w-full bg-transparent py-3 text-sm outline-none"
          />
        </div>
        <div
          ref={containerRef}
          className="no-scrollbar relative max-h-60 overflow-y-auto px-1 py-1"
          {...handlers}
        >
          {activeIndex !== null && itemRects[activeIndex] ? (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-none bg-muted transition-[top,height,left,width] duration-150 ease-out"
              style={{
                top: itemRects[activeIndex].top,
                height: itemRects[activeIndex].height,
                left: itemRects[activeIndex].left,
                width: itemRects[activeIndex].width,
              }}
            />
          ) : null}
          {filteredStates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No state found.
            </p>
          ) : (
            filteredStates.map((stateName, index) => {
              const isSelected = value === stateName;
              const isHovered = activeIndex === index;

              return (
                <button
                  key={stateName}
                  ref={(element) => registerItem(index, element)}
                  type="button"
                  onClick={() => {
                    onValueChange(stateName === value ? "" : stateName);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative z-10 flex h-8 w-full items-center rounded-none bg-transparent px-2 text-left text-sm outline-none transition-colors",
                    isSelected || isHovered
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <span className="truncate">{stateName}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
