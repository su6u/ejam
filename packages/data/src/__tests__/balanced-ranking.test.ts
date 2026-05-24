import { describe, expect, it } from "vitest";
import {
  applyBalancedRanking,
  computeBalancedScore,
  computeBranchScore,
  computeInstituteScore,
} from "../college-predictor/balanced-ranking";
import type { ProgramPrediction } from "../college-predictor/engine";

function makeProgram(
  overrides: Partial<ProgramPrediction> = {},
): ProgramPrediction {
  return {
    institute_id: "nit-trichy",
    program_id: "cse",
    seat_type: "OPEN",
    quota: "AI",
    gender: "Gender-Neutral",
    instype: "NIT",
    degree: "B.Tech",
    duration_years: 4,
    weighted_mean: 2000,
    predicted_closing_rank: 2000,
    sigma_effective: 200,
    cumulative_probability: 0.85,
    band: "safe",
    data_quality: "sufficient",
    years_of_data: 4,
    last_data_year: 2024,
    fill_round: 6,
    round_probs: [0.5, 0.7, 0.85],
    ...overrides,
  };
}

describe("balanced ranking", () => {
  it("ranks higher NIRF NIT CSE safe pick above lower NIT with lower chance", () => {
    const instituteMeta = new Map([
      ["nit-trichy", { nirf_rank: 9 }],
      ["nit-agartala", { nirf_rank: 80 }],
    ]);

    const ranked = applyBalancedRanking(
      [
        makeProgram({
          institute_id: "nit-agartala",
          program_id: "cse",
          cumulative_probability: 0.6,
          band: "target",
          predicted_closing_rank: 8000,
        }),
        makeProgram({
          institute_id: "nit-trichy",
          program_id: "cse",
          cumulative_probability: 0.6,
          band: "target",
          predicted_closing_rank: 2500,
        }),
      ],
      { instituteMeta },
    );

    expect(ranked[0]?.institute_id).toBe("nit-trichy");
    expect(ranked[0]?.balanced_score).toBeGreaterThan(
      ranked[1]?.balanced_score ?? 0,
    );
  });

  it("neutralizes branch score when branch filter is active", () => {
    const instituteMeta = new Map([["nit-a", { nirf_rank: 20 }]]);

    const cse = applyBalancedRanking(
      [
        makeProgram({
          institute_id: "nit-a",
          program_id: "cse",
          cumulative_probability: 0.6,
        }),
      ],
      { instituteMeta, branchFilterActive: true },
    )[0]!;
    const civil = applyBalancedRanking(
      [
        makeProgram({
          institute_id: "nit-a",
          program_id: "civil",
          cumulative_probability: 0.6,
        }),
      ],
      { instituteMeta, branchFilterActive: true },
    )[0]!;

    expect(cse.balanced_score).toBe(civil.balanced_score);
  });

  it("scores branches with fixed global order", () => {
    expect(computeBranchScore("cse", "Computer Science")).toBe(100);
    expect(computeBranchScore("ece", "Electronics")).toBeGreaterThan(
      computeBranchScore("civil", "Civil Engineering"),
    );
  });

  it("uses NIRF to boost institute score within tier", () => {
    const top = computeInstituteScore("IIT", 1, 500, 10000);
    const lower = computeInstituteScore("IIT", 50, 500, 10000);
    expect(top).toBeGreaterThan(lower);
  });

  it("computes balanced score as product of normalized factors", () => {
    expect(computeBalancedScore(80, 100, 0.5, false)).toBe(0.4);
    expect(computeBalancedScore(80, 50, 0.5, true)).toBe(0.4);
  });
});
