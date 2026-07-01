/**
 * client-side text search across ProgramPrediction fields — matches on
 * institute id, program name/id, band label, closing rank, seat pool,
 * degree, and duration. each query token must match at least one field
 * for a row to pass (AND semantics across tokens)
 **/

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { genderShort } from "@/components/predictor/results-row-format";
import { BAND_STYLES } from "@/lib/bands";

// aliases so users can type "longshot", "long shot", "long" and still match
const BAND_ALIASES: Record<string, string[]> = {
  safe: ["safe"],
  target: ["target"],
  reach: ["reach"],
  "long-shot": ["long-shot", "longshot", "long shot", "long"],
};

function bandMatchesToken(band: string, token: string): boolean {
  const aliases = BAND_ALIASES[band];
  if (aliases?.some((a) => a.includes(token))) return true;
  const label = BAND_STYLES[band as keyof typeof BAND_STYLES]?.label;
  return label ? label.toLowerCase().includes(token) : false;
}

/** build a compact searchable string per row — cached by callers */
function buildSearchText(row: ProgramPrediction): string {
  return [
    row.institute_id,
    row.program_name ?? "",
    row.program_id,
    row.degree,
    row.instype,
    row.seat_type,
    row.quota.toUpperCase(),
    genderShort(row.gender),
    String(row.predicted_closing_rank),
    `${row.duration_years}yr`,
    `${row.duration_years} year`,
  ]
    .join(" ")
    .toLowerCase();
}

/** weak map so we only build the search text once per object reference */
const searchTextCache = new WeakMap<ProgramPrediction, string>();

function getSearchText(row: ProgramPrediction): string {
  let text = searchTextCache.get(row);
  if (!text) {
    text = buildSearchText(row);
    searchTextCache.set(row, text);
  }
  return text;
}

export function applyResultsSearch(
  programs: ProgramPrediction[],
  query: string,
): ProgramPrediction[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return programs;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return programs;

  return programs.filter((row) => {
    const text = getSearchText(row);
    return tokens.every(
      (token) => text.includes(token) || bandMatchesToken(row.band, token),
    );
  });
}
