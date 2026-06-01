"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { deferAfterPress, pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

interface OptionPickerOption {
  value: string;
  label: string;
}

interface OptionPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<OptionPickerOption>;
  placeholder?: string;
  triggerClassName?: string;
  listClassName?: string;
  id?: string;
}

export function OptionPicker({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  triggerClassName,
  listClassName,
  id,
}: OptionPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
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
        <span
          className="t-icon-swap shrink-0 text-muted-foreground/80"
          data-state={open ? "b" : "a"}
          aria-hidden
        >
          <ChevronDownIcon className="t-icon size-4" data-icon="a" />
          <ChevronUpIcon className="t-icon size-4" data-icon="b" />
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--anchor-width) min-w-(--anchor-width) rounded-none p-1"
        align="start"
      >
        <div
          role="listbox"
          className={cn("flex flex-col", listClassName)}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  deferAfterPress(() => {
                    onValueChange(option.value);
                    setOpen(false);
                  });
                }}
                className={cn(
                  "flex h-8 w-full items-center rounded-none px-2 text-left text-sm outline-none",
                  pressableClass,
                  "hover:bg-muted hover:text-foreground",
                  isSelected ? "text-foreground" : "text-muted-foreground",
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
