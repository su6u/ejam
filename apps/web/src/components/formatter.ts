const LOCALE = "en-US";

/** Whole numbers with grouping (visits, sessions, counts). */
export function formatInteger(value: number) {
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 0,
  }).format(value);
}
