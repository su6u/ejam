import type {
  CollegePredictionResult,
  ProgramPrediction,
} from "@ejam/data/college-predictor";

type PredictionMetadata = CollegePredictionResult["metadata"];

export function countClientHiddenLongShots(
  programs: ProgramPrediction[],
  includeAll: boolean,
): number {
  if (includeAll) return 0;
  return programs.reduce(
    (count, program) => count + (program.band === "doesnt-matter" ? 1 : 0),
    0,
  );
}

export function hasOnlyClientHiddenLongShots(
  programs: ProgramPrediction[],
  includeAll: boolean,
): boolean {
  return (
    programs.length > 0 &&
    countClientHiddenLongShots(programs, includeAll) === programs.length
  );
}

export function withClientHiddenLongShotMetadata(
  metadata: PredictionMetadata | undefined,
  clientHiddenLongShots: number,
): PredictionMetadata | undefined {
  if (!metadata || clientHiddenLongShots <= metadata.hidden_programs) {
    return metadata;
  }

  return {
    ...metadata,
    hidden_programs: clientHiddenLongShots,
  };
}
