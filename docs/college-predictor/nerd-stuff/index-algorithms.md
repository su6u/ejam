# Index algorithms

The predictor index is built offline with DuckDB. Each builder reads cutoff parquets, aggregates years of history, and writes one parquet the live API loads.

Two algorithms on purpose:

- **`jam-josaa-v3`** for JoSAA cutoffs (JEE Main + JEE Advanced) — **production**
- **`jam-csab-v2`** for CSAB cutoffs (supplementary counselling)

> **`jam-josaa-v2` is deprecated** (2026-06). Replaced by v3: +3%/yr pool shift and softer round weights. See [jam-josaa-v3](#jam-josaa-v3-josaa) and [Deprecated: jam-josaa-v2](#deprecated-jam-josaa-v2).

## Data flow

```mermaid
flowchart TB
    subgraph sources["Cutoff sources"]
        direction LR
        J[(JoSAA parquets)]
        C[(CSAB parquets)]
    end

    subgraph build["Offline build · DuckDB"]
        direction TB
        U[Union + dedupe]
        W[Year weights + outlier guard]
        R[Round means + fill_round]
        P[predicted_closing_rank + sigma_effective]
        U --> W --> R --> P
    end

    subgraph dist["data/dist/"]
        direction LR
        I1[college_predictor_index.parquet]
        I2[csab_predictor_index.parquet]
    end

    subgraph runtime["Live predictors"]
        direction TB
        F{Exam filter}
        M[JEE Main · non-IIT]
        A[JEE Advanced · IIT]
        S[CSAB · NIT+]
        OUT[API rows + bands]
    end

    J --> U
    C --> U
    P --> I1
    P --> I2
    I1 --> F
    I2 --> F
    F --> M & A & S
    M --> OUT
    A --> OUT
    S --> OUT
```

## Shared preprocessing

Both builders:

1. Union all cutoff parquet files.
2. Cap rounds above 6 into round 6.
3. Rewrite raw `3IT` institute type to canonical `IIIT`.
4. Deduplicate: keep the **max** closing rank per program, year, and round (worst closing rank wins ties).
5. Year weights with a COVID-style **outlier guard**: if a year's closing rank is more than $2.5\,\sigma_{\mathrm{inter}}$ away from the median of other years in the window, that year's weight drops to $0.01$.
6. Per-round weighted means for the round trajectory columns.
7. `fill_round` as a weighted average of each year's last round with data.
8. $\sigma_{\mathrm{base}} = \max(\sigma_w,\; p_{\mathrm{floor}} \cdot \bar{w})$.
9. Inflate $\sigma_{\mathrm{eff}} \leftarrow 1.5\,\sigma_{\mathrm{base}}$ when years of data is below 3.

Data quality labels:

| Years of history | Label |
| --- | --- |
| 1 | `pooled` |
| 2 | `inferred` |
| 3+ | `sufficient` |

## jam-josaa-v3 (JoSAA)

**Source:** `data/engineering/jee/josaa/cutoffs/`

**Output:** `data/dist/college_predictor_index.parquet`

Shipped 2026-06 after sandbox sweeps (817 configs, walk-forward on 2023–2025). Config: `packages/data-cli/src/jam/config.ts`.

### Anchor closing rank per year

Before year-level stats, each year gets one anchor closing rank. Rounds inside that year are combined with fixed weights (later rounds dominate more than v2):

| Round | Weight $w_r$ |
| --- | --- |
| 1 | $0.01$ |
| 2 | $0.02$ |
| 3 | $0.05$ |
| 4 | $0.10$ |
| 5 | $0.22$ |
| 6 | $0.60$ |

Later rounds count more because that's where seats actually settled. v3 shifts weight toward the final round (R6) compared to v2.

### Year weights (4-year window)

Most recent year first:

| Recency (`yr`) | Year weight |
| --- | --- |
| 1 (latest) | $0.50$ |
| 2 | $0.30$ |
| 3 | $0.15$ |
| 4 | $0.05$ |

### Weighted statistics

From the anchor series:

- **`weighted_mean`**: weighted average closing rank
- **`weighted_std`**: weighted standard deviation
- **`trend_slope`**: weighted linear regression slope (rank change per year)

### Predicted closing rank

Let $g = \mathrm{prediction\_year} - \mathrm{last\_data\_year}$.

Trend is capped to $\pm 3\%$ of $\bar{w}$ per year, then scaled by $0.7$ before applying the gap:

$$
\delta = \mathrm{clamp}(m,\; \pm 0.03\bar{w}) \cdot 0.7 \cdot g
$$

$$
\hat{c} = \left(\bar{w} + \delta\right) \cdot (1 + s)^{g}
$$

$m$ = `trend_slope`, $\bar{w}$ = `weighted_mean`, $s$ = pool shift.

**Pool shift** models rank inflation as more candidates appear. Production default **+3% per year** (`JAM_POOL_SHIFT_PCT` in `config.ts`, mirrored in `nta-pool-stats.json`). Literal year-on-year unique appeared growth (~4.3% for 2025→2026) was backtested but not used as-is; it may overshoot. Override: `EJAM_POOL_SHIFT_PCT`.

**Prediction year** defaults to calendar year. Override: `EJAM_PREDICTION_YEAR`.

Same formula in SQL:

```sql
ROUND(
  (weighted_mean + capped_trend * 0.7 * gap)
  * POWER(1 + pool_shift, gap)
)
```

### Sigma floor

$$
\sigma_{\mathrm{base}} = \max(\sigma_w,\; 0.025\,\bar{w})
$$

Uncertainty scales with how high the typical cutoff rank is, instead of a flat $\pm 50$ for everyone.

### Walk-forward backtest (sandbox, 2023–2025 avg)

| Config | Avg ±20% | Worst year ±20% |
| --- | --- | --- |
| **v3 (wf-rw-soft-p30)** | **72.3%** | **69.9%** |
| v2 baseline | 70.8% | 69.8% |

2025 holdout alone: v3 reaches ~73.9% ±20% vs v2 ~72.8%.

## Deprecated: jam-josaa-v2

> **Do not use for new index builds.** Retained in code as `JAM_JOSAA_V2` / `JAM_V2_*` constants for historical comparison and sandbox baselines only.

| Change v2 → v3 | v2 (deprecated) | v3 (production) |
| --- | --- | --- |
| Pool shift | +1%/yr | **+3%/yr** |
| Round weights (R1…R6) | 5%, 8%, 12%, 15%, 22%, 38% | **1%, 2%, 5%, 10%, 22%, 60%** |
| All other hyperparams | unchanged | unchanged |

v2 anchor weights for reference:

| Round | Weight $w_r$ |
| --- | --- |
| 1 | $0.05$ |
| 2 | $0.08$ |
| 3 | $0.12$ |
| 4 | $0.15$ |
| 5 | $0.22$ |
| 6 | $0.38$ |

v2 pool shift default was +1%/yr from `nta-pool-stats.json`.

## jam-csab-v2 (CSAB)

**Source:** `data/engineering/jee/csab/cutoffs/`

**Output:** `data/dist/csab_predictor_index.parquet`

CSAB cutoffs are worse (numerically higher rank) than JoSAA late rounds because strong candidates already took JoSAA seats. CSAB stays in a separate index, not blended into JoSAA.

### Differences from JoSAA

| Aspect | JoSAA | CSAB |
| --- | --- | --- |
| Year window | 4 years | 2 years |
| Year weights | $0.50, 0.30, 0.15, 0.05$ | $0.70, 0.30$ |
| Anchor series | Round-weighted blend | Last round of each year |
| Pool shift | Yes (+3%/yr default) | No |
| Default `fill_round` | Weighted from history | 2 |
| Predicted rank | Single formula | 50/50 ensemble of two profiles |

### Blended mean (per profile)

Each profile mixes weighted mean and median:

$$
\bar{w}_{\mathrm{blend}} = (1 - \beta)\,\bar{w} + \beta\,\tilde{w}
$$

$\beta$ = `median_blend`, $\tilde{w}$ = median mean.

`median_blend` varies by institute type (`NIT`, `IIIT`, `CFI`). CFI gets a higher blend because CSAB CFI cutoffs are noisier.

### Production ensemble

Two profiles averaged 50/50:

1. **best-split** (default blends per instype)
2. **cap-cfi10** (tighter trend caps, especially for CFI at 10%)

$$
\hat{c} = \mathrm{round}\!\left(\frac{\hat{c}_a + \hat{c}_b}{2}\right)
$$

Trend cap default $\pm 6\%$ of $\bar{w}$ per year (instype-specific overrides in the cap profile). Trend gap multiplier $1.0$ (full gap, unlike JoSAA's $0.7$).

$$
\sigma_{\mathrm{base}} = \max(\sigma_w,\; 0.03\,\bar{w})
$$

## After the index loads

Exam-specific predictors filter and enrich rows:

### JEE Main

Drop IIT rows. Attach state and program names from `institutes.json` / `programs.json`. Filter by quota: HS (home state matches institute), OS (different state), AI (all), or special quotas (Goa, J&K, Ladakh, Andhra Pradesh) when passed via API.

Seat type `Gen-EWS` from the category dropdown maps to index label `EWS`. Optional `has_ews_certificate` (URL param `ews=true`) runs a second prediction pass on EWS seat rows for side-by-side OPEN vs EWS comparison.

### JEE Advanced

Keep IIT rows only. Quota fixed to AI.

### CSAB

Load CSAB index only. Same quota rules as JEE Main.
