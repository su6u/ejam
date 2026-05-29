# From rank to results

Each result row is one **program seat pool**: institute + branch + seat type + quota + gender. The engine asks: given this student's rank, how likely was a similar profile to get that seat in past years, adjusted forward to this cycle?

## Index row (already computed offline)

Before any user hits Predict, the index builder has already:

- Weighted multiple years of opening/closing ranks per round
- Projected a **predicted closing rank** for the upcoming cycle (trend + pool shift on JoSAA)
- Stored per-round means and a **fill round** (when the seat historically stopped moving)
- Set **sigma_effective** (how wide the uncertainty is; wider when data is sparse)

The live API does not rebuild this. It reads the row and runs probability math.

## Per-round chance

For each counselling round up to `fill_round`, the engine treats rank vs predicted closing rank as a normal distribution:

```
P = Φ( (predicted_closing_rank − student_rank) / sigma_effective )
```

Better rank (lower number) → higher P. Equal rank → about 50%.

Round probabilities combine into one headline **chance** (average cumulative probability through `fill_round`). The round bars in the table show that trajectory.

Full formulas: [Prediction engine](../nerd-stuff/prediction-engine.md).

## Chance bands

Bands group rows for scanning. Thresholds are fixed in code:

| Band | Chance | Meaning |
| --- | --- | --- |
| **Safe** | 85%+ | Strong historical margin at this rank |
| **Target** | 40% to below 85% | Competitive, plausible |
| **Reach** | 10% to below 40% | Tight; possible but not comfortable |
| **Long-shot** | Below 10% | Excluded from default results |

Bands are **planning labels**, not counselling rules and not guarantees. A Safe row can still miss if cutoffs shift.

Programs below 10% are hidden unless the request includes `include_all=true` (URL or API).

## Closing rank column

**Predicted closing rank** is the index forecast for where that seat might close this year, not last year's cutoff copied as-is. **Chance** compares your rank to that forecast using `sigma_effective`.

## Sorting after scoring

Default sort is **Balanced**: institute quality heuristics × branch tier × chance. Other modes sort by best chance, closing rank, or institute id. Filters (institute type, band) apply on the client without re-running the engine.

Balanced formula: [Balanced ranking](../nerd-stuff/balanced-ranking.md).

## Data quality

Each row carries a quality tag from how many years of cutoff history backed the index entry:

| Tag | Years | Trust |
| --- | --- | --- |
| `sufficient` | 3+ | Steadier |
| `inferred` | 2 | More uncertainty |
| `pooled` | 1 | Widest sigma; treat as rough |

Check the detail panel on a row for the tag and round chart before treating a number as solid.

**Back:** [Overview](overview.md) · [Getting started](../learn/getting-started.md)
