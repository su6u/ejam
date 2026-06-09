# Backtest

Holdout check for `jam-josaa-v2` and `jam-csab-v2`. Rebuilds each index from training cutoffs only, forecasts 2025 closing ranks, and compares to actual 2025 final-round cutoffs.

Not a promise for this year's counselling. Useful for catching bad hyperparam changes before shipping.

## Setup

```bash
pnpm data:fetch --download   # needs local cutoff parquets
pnpm backtest
```

Writes `data/dist/backtest-results.json` (gitignored). Exits non-zero if either builder's within-20% rate drops below 30%.

Implementation: `packages/data-cli/src/backtest/predictor.ts`. Training SQL mirrors the production index builders (`build-college-predictor-index.ts`, `build-csab-predictor-index.ts`).

## Train / holdout split

| Split | Years | Role |
| --- | --- | --- |
| Training | 2021–2024 | Build predicted closing rank + $\sigma_{\mathrm{eff}}$ per program seat |
| Holdout | 2025 | Ground truth from official cutoffs |

For each `(institute, program, seat_type, quota, gender)` key:

1. **Training:** run the same DuckDB pipeline as production, but cap input cutoffs at `year <= 2024`. JoSAA uses a 4-year weighted window; CSAB uses 2 years and the 50/50 ensemble.
2. **Holdout:** take 2025's **final round** closing rank (max round per key, worst closing rank wins dedupe ties).
3. **Match:** keep keys present in both training index and 2025 holdout.

Latest run (2026-06-09): **11,069** JoSAA programs matched, **1,221** CSAB programs matched.

## Metrics

### ±20% cutoff accuracy (`within_20pct`)

For each matched program:

$$
\left|\frac{\hat{c} - a}{a}\right| \le 0.20
$$

$\hat{c}$ = predicted closing rank from the training-only index. $a$ = actual 2025 final-round closing rank.

Reported as the fraction of matched programs that pass. README also mentions ±10% (`within_10pct`) in the JSON output; not shown on the homepage.

### Band boundary hit (`band_accuracy`)

At the **actual** 2025 closing rank $a$, plug $r = a$ into the normal CDF with the training-only $\hat{c}$ and $\sigma_{\mathrm{eff}}$. Classify the band (safe ≥85%, target ≥40%, reach ≥10%, else long-shot).

Count a hit when the band is **safe** or **target**. That checks whether a student sitting exactly on last year's closing rank would see a non-pessimistic label.

This is not the same as "did we predict the right band for a random applicant." It only tests programs at the cutoff boundary.

### Other fields in `backtest-results.json`

| Field | Meaning |
| --- | --- |
| `mae_ranks` / `median_ae_ranks` | Mean / median absolute rank error |
| `band_calibration` | Per-band direction accuracy (optimistic vs pessimistic vs predicted rank) |
| `within_10pct` | Same as ±20%, threshold 10% |

## Latest results (2025 holdout)

| Metric | JoSAA | CSAB |
| --- | --- | --- |
| ±20% cutoff accuracy | 72.8% | 68.7% |
| Band boundary hit | 42.0% | 51.9% |
| Programs matched | 11,069 | 1,221 |
| Median absolute error (ranks) | 455 | 9,927 |

Reproduce: `pnpm backtest` and read the summary, or open `data/dist/backtest-results.json`.

## What this does not test

- Round-by-round cumulative chance stacking ([4] in the README). Backtest only scores the index's $\hat{c}$ and $\sigma_{\mathrm{eff}}$.
- Balanced sort ([5]). No institute/branch scoring in the backtest.
- Live API filters (quota, HS/OS, exam path). All matched seat keys are scored.

When you change index hyperparams (`packages/data-cli/src/jam/config.ts`, `csab-config.ts`), run `pnpm backtest` before publishing a data release.
