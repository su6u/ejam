"use client";

import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_RANK_LENGTH = 7;
const URL_SYNC_MS = 400;

export type RankInputHandle = {
  flush: () => string;
};

interface RankInputProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  id?: string;
  ref?: Ref<RankInputHandle>;
}

/** Keeps a local draft while focused so URL sync does not reset caret position. */
export function RankInput({
  value,
  onValueChange,
  className,
  id,
  ref,
}: RankInputProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const commit = useCallback(
    (next: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      onValueChange(next);
    },
    [onValueChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      flush: () => {
        const next = focused ? draft : value;
        commit(next);
        return next;
      },
    }),
    [draft, focused, value, commit],
  );

  const handleChange = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, MAX_RANK_LENGTH);
    setDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onValueChange(next), URL_SYNC_MS);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      name="predictor-rank"
      value={focused ? draft : value}
      onFocus={() => {
        setDraft(value);
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
        commit(draft);
      }}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="e.g. 4521"
      maxLength={MAX_RANK_LENGTH}
      required
      aria-required
      data-transparent-input=""
      className={cn(
        "w-full rounded-none tabular-nums",
        "border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-transparent",
        className,
      )}
    />
  );
}
