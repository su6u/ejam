import type { ProgramPrediction } from "@ejam/data/college-predictor";

export function programKey(p: ProgramPrediction): string {
  return `${p.institute_id}::${p.program_id}::${p.seat_type}::${p.quota}::${p.gender}`;
}
