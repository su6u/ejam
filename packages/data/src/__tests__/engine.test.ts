/**
 * probability engine tests
 *
 * tests assert observable outputs for known inputs — not implementation details.
 * the normalCDF approximation (Abramowitz & Stegun 7.1.26) has a max error of
 * ~5e-5, so tolerances are set to 3 decimal places throughout.
 **/

import { describe, expect, it } from "vitest";
import {
  type CollegePredictorIndexRow,
  classifyBand,
  computeProbability,
  computeRoundProbs,
  normalCDF,
  predictPrograms,
  REACH_BAND_MIN_PROBABILITY,
} from "../college-predictor/engine";

describe("normalCDF", () => {
  it("returns 0.5 at x=0", () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 4);
  });

  it("returns ~0.8413 at x=1", () => {
    expect(normalCDF(1)).toBeCloseTo(0.8413, 3);
  });

  it("returns ~0.1587 at x=-1 (symmetry)", () => {
    expect(normalCDF(-1)).toBeCloseTo(0.1587, 3);
  });

  it("returns ~0.9750 at x=1.96 (95% CI boundary)", () => {
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 3);
  });

  it("returns ~0.9987 at x=3", () => {
    expect(normalCDF(3)).toBeCloseTo(0.9987, 3);
  });

  it("returns ~0.0013 at x=-3 (symmetry)", () => {
    expect(normalCDF(-3)).toBeCloseTo(0.0013, 3);
  });

  it("satisfies Φ(x) + Φ(-x) = 1 for arbitrary x", () => {
    for (const x of [0.5, 1.2, 2.5, -0.8]) {
      expect(normalCDF(x) + normalCDF(-x)).toBeCloseTo(1, 10);
    }
  });

  it("is monotonically increasing", () => {
    const xs = [-3, -2, -1, 0, 1, 2, 3];
    for (let i = 0; i < xs.length - 1; i++) {
      expect(normalCDF(xs[i]!)).toBeLessThan(normalCDF(xs[i + 1]!));
    }
  });
});

describe("computeProbability", () => {
  it("returns ~0.5 when student rank equals predicted closing rank", () => {
    // boundary student is 50/50 by definition — this is the calibration invariant
    expect(computeProbability(1000, 1000, 100)).toBeCloseTo(0.5, 2);
  });

  it("returns > 0.5 when student rank is better than predicted closing rank", () => {
    expect(computeProbability(800, 1000, 100)).toBeGreaterThan(0.5);
  });

  it("returns < 0.5 when student rank is worse than predicted closing rank", () => {
    expect(computeProbability(1200, 1000, 100)).toBeLessThan(0.5);
  });

  it("approaches 1 when student rank is far better than closing rank", () => {
    expect(computeProbability(100, 1000, 100)).toBeGreaterThan(0.99);
  });

  it("approaches 0 when student rank is far worse than closing rank", () => {
    expect(computeProbability(5000, 1000, 100)).toBeLessThan(0.01);
  });

  it("uses sigma floor of 1 to avoid division by zero", () => {
    // sigma=0 would produce NaN without the floor; this guards that invariant
    const p = computeProbability(1000, 1000, 0);
    expect(Number.isFinite(p)).toBe(true);
  });
});

describe("classifyBand", () => {
  it("classifies ≥ 0.85 as safe", () => {
    expect(classifyBand(0.85)).toBe("safe");
    expect(classifyBand(1.0)).toBe("safe");
  });

  it("classifies 0.40–0.84 as target", () => {
    expect(classifyBand(0.4)).toBe("target");
    expect(classifyBand(0.84)).toBe("target");
  });

  it("classifies 0.10–0.39 as reach", () => {
    expect(classifyBand(0.1)).toBe("reach");
    expect(classifyBand(0.39)).toBe("reach");
  });

  it("classifies < 0.10 as long-shot", () => {
    expect(classifyBand(0.09)).toBe("long-shot");
    expect(classifyBand(0)).toBe("long-shot");
  });
});

function makeRow(
  overrides: Partial<CollegePredictorIndexRow> = {},
): CollegePredictorIndexRow {
  return {
    institute_id: "test-inst",
    program_id: "test-prog",
    seat_type: "OPEN",
    quota: "AI",
    gender: "Gender-Neutral",
    instype: "NIT",
    degree: "B.Tech",
    duration_years: 4,
    weighted_mean: 1000,
    weighted_std: 100,
    trend_slope: 0,
    sigma_base: 100,
    sigma_effective: 100,
    predicted_closing_rank: 1000,
    data_quality: "sufficient",
    years_of_data: 4,
    last_data_year: 2024,
    min_closing_rank: 800,
    max_closing_rank: 1200,
    round1_mean: 900,
    round2_mean: 950,
    round3_mean: 980,
    round4_mean: 1000,
    round5_mean: 1010,
    round6_mean: 1020,
    fill_round: 6,
    ...overrides,
  };
}

describe("computeRoundProbs", () => {
  it("always returns an array of length 6", () => {
    expect(computeRoundProbs(1000, makeRow())).toHaveLength(6);
  });

  it("probabilities are non-decreasing across rounds (cumulative)", () => {
    const probs = computeRoundProbs(800, makeRow());
    for (let i = 0; i < probs.length - 1; i++) {
      expect(probs[i]!).toBeLessThanOrEqual(probs[i + 1]! + 0.0001);
    }
  });

  it("freezes at fill_round value for subsequent rounds", () => {
    // fill_round=3 means rounds 4–6 must equal round 3's cumulative value
    const probs = computeRoundProbs(1000, makeRow({ fill_round: 3 }));
    expect(probs[3]).toBeCloseTo(probs[2]!, 4);
    expect(probs[4]).toBeCloseTo(probs[2]!, 4);
    expect(probs[5]).toBeCloseTo(probs[2]!, 4);
  });

  it("all values are in [0, 1]", () => {
    for (const p of computeRoundProbs(1000, makeRow())) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("handles null round means by freezing at the last known cumulative value", () => {
    const row = makeRow({
      round3_mean: null,
      round4_mean: null,
      round5_mean: null,
      round6_mean: null,
      fill_round: 2,
    });
    const probs = computeRoundProbs(1000, row);
    expect(probs).toHaveLength(6);
    expect(probs[2]).toBeCloseTo(probs[1]!, 4);
  });
});

function makeIndexRows(): CollegePredictorIndexRow[] {
  return [
    makeRow({
      institute_id: "iit-a",
      program_id: "cse",
      predicted_closing_rank: 100,
      sigma_effective: 10,
      instype: "IIT",
    }),
    makeRow({
      institute_id: "iit-b",
      program_id: "cse",
      predicted_closing_rank: 300,
      sigma_effective: 30,
      instype: "IIT",
    }),
    makeRow({
      institute_id: "nit-a",
      program_id: "cse",
      predicted_closing_rank: 2000,
      sigma_effective: 200,
      instype: "NIT",
    }),
    makeRow({
      institute_id: "nit-b",
      program_id: "electronics",
      predicted_closing_rank: 5000,
      sigma_effective: 500,
      instype: "NIT",
    }),
    makeRow({
      institute_id: "nit-c",
      program_id: "civil",
      predicted_closing_rank: 9000,
      sigma_effective: 900,
      instype: "NIT",
    }),
  ];
}

describe("predictPrograms", () => {
  it("returns programs sorted safe → target → reach → long-shot", () => {
    const result = predictPrograms({
      indexRows: makeIndexRows(),
      studentRank: 2500,
      seatType: "OPEN",
      gender: "Gender-Neutral",
      includeAll: true,
    });
    const bands = result.programs.map((p) => p.band);
    const bandOrder = { safe: 0, target: 1, reach: 2, "long-shot": 3 };
    for (let i = 0; i < bands.length - 1; i++) {
      expect(bandOrder[bands[i]!]).toBeLessThanOrEqual(
        bandOrder[bands[i + 1]!],
      );
    }
  });

  it("hides long-shot programs below reach band by default", () => {
    const result = predictPrograms({
      indexRows: makeIndexRows(),
      studentRank: 50000,
      seatType: "OPEN",
      gender: "Gender-Neutral",
    });
    expect(result.metadata.threshold_used).toBe(REACH_BAND_MIN_PROBABILITY);
    for (const p of result.programs) {
      expect(p.cumulative_probability).toBeGreaterThanOrEqual(
        REACH_BAND_MIN_PROBABILITY,
      );
      expect(p.band).not.toBe("long-shot");
    }
  });

  it("includes all programs when includeAll=true", () => {
    const result = predictPrograms({
      indexRows: makeIndexRows(),
      studentRank: 50000,
      seatType: "OPEN",
      gender: "Gender-Neutral",
      includeAll: true,
    });
    expect(result.programs.length).toBe(makeIndexRows().length);
  });

  it("filters by institute_type", () => {
    const result = predictPrograms({
      indexRows: makeIndexRows(),
      studentRank: 2500,
      seatType: "OPEN",
      gender: "Gender-Neutral",
      includeAll: true,
      filters: { institute_type: ["IIT"] },
    });
    for (const p of result.programs) {
      expect(p.instype).toBe("IIT");
    }
  });

  it("filters by branch_name — only programs matching the branch are returned", () => {
    const result = predictPrograms({
      indexRows: makeIndexRows(),
      studentRank: 2500,
      seatType: "OPEN",
      gender: "Gender-Neutral",
      includeAll: true,
      filters: { branch_name: "civil" },
    });
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0]?.program_id).toBe("civil");
  });

  it("returns empty programs when no rows match seat_type/gender", () => {
    const result = predictPrograms({
      indexRows: makeIndexRows(),
      studentRank: 1000,
      seatType: "SC",
      gender: "Gender-Neutral",
    });
    expect(result.programs).toHaveLength(0);
  });

  it("grouped_by_band contains the same programs as programs array", () => {
    const result = predictPrograms({
      indexRows: makeIndexRows(),
      studentRank: 2500,
      seatType: "OPEN",
      gender: "Gender-Neutral",
      includeAll: true,
    });
    const fromGroups = [
      ...result.grouped_by_band.safe,
      ...result.grouped_by_band.target,
      ...result.grouped_by_band.reach,
      ...result.grouped_by_band["long-shot"],
    ];
    expect(fromGroups.length).toBe(result.programs.length);
  });

  it("metadata counts are consistent", () => {
    const result = predictPrograms({
      indexRows: makeIndexRows(),
      studentRank: 2500,
      seatType: "OPEN",
      gender: "Gender-Neutral",
    });
    expect(result.metadata.displayed_programs).toBe(result.programs.length);
    expect(result.metadata.total_matching_programs).toBeGreaterThanOrEqual(
      result.programs.length,
    );
    expect(result.metadata.hidden_programs).toBe(
      result.metadata.total_matching_programs -
        result.metadata.displayed_programs,
    );
  });
});
