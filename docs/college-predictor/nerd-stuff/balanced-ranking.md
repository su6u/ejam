# Balanced ranking

Chance alone pushes very safe but less popular branches to the top. Balanced ranking tries to surface options that are both reachable and reasonably desirable. It runs after probability calculation, using metadata on each row plus NIRF ranks from the institute registry.

## Composite formula

$$
\mathrm{score} = \frac{I}{100} \cdot \frac{B}{100} \cdot P
$$

$I$ = institute score, $B$ = branch factor, $P$ = cumulative probability. Higher is better. $I$ and $B$ are 0–100; $P$ is 0–1.

When a **branch name filter** is active in the UI, `branch_factor` is forced to `100` so every visible row is branch-neutral (the filter already narrowed branches).

## Institute score

Base score by institute type:

| Type | Base |
| --- | --- |
| IIT | 95 |
| NIT | 75 |
| IIIT | 65 |
| CFI | 55 |
| GFTI | 50 |
| Unknown | 40 |

**If NIRF rank is known:** up to +5 points. Rank 1 gets full bonus; rank 200+ gets none:

$$
b_{\mathrm{nirf}} = \max\!\left(0,\; 5 \cdot \left(1 - \frac{n - 1}{199}\right)\right)
$$

$$
I = \min(100,\; I_{\mathrm{base}} + b_{\mathrm{nirf}})
$$

where $n$ = NIRF rank.

**If NIRF is missing:** blend base with competitiveness vs the worst predicted closing rank in the current result set:

$$
\kappa = 1 - \frac{\hat{c}}{\hat{c}_{\max}}
$$

$$
I = \min\!\left(100,\; 0.7\, I_{\mathrm{base}} + 0.3 \cdot \max(0, \kappa) \cdot 100\right)
$$

Tighter cutoffs (lower rank number) imply stronger demand, so the fallback nudges score up.

## Branch score

Branch names matched with keyword tiers on `program_id` and `program_name`:

| Pattern (examples) | Score |
| --- | --- |
| CSE, CS, Computer Science | 100 |
| AI, ML, Data Science | 92 |
| ECE, Electronics | 85 |
| EE, Electrical | 80 |
| ME, Mechanical | 72 |
| CE, Civil | 68 |
| Chemical | 65 |
| No match | 50 |

First matching tier wins. Rough popularity proxy, not placement or salary data.

## Sort tie-breakers

When $\mathrm{score}$ ties:

1. Higher `institute_score`
2. Higher `branch_score`
3. Higher `cumulative_probability`
4. Lower `predicted_closing_rank` (more competitive)

## Other sort modes

| Sort key | Behavior |
| --- | --- |
| **Balanced** | Composite score above (default) |
| **Best chance** | Highest cumulative probability first, then closing rank (UI label; internal key `chance`) |
| **Closing rank** | Most competitive programs first |
| **Institute** | Alphabetical by institute, then program |

Balanced scores recompute on filtered subsets so the competitiveness fallback uses the current result ceiling, not the full national list.
