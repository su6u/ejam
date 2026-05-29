# Balanced ranking

Chance alone pushes very safe but less popular branches to the top. Balanced ranking tries to surface options that are both reachable and reasonably desirable. It runs after probability calculation, using metadata already on each row plus NIRF ranks from the institute registry.

## Composite formula

```
balanced_score = (institute_score / 100) × (branch_factor / 100) × cumulative_probability
```

Higher is better. All three factors are on a 0-100 scale except probability, which is 0-1.

When a **branch name filter** is active in the UI, `branch_factor` is forced to `100` so every visible row is treated as branch-neutral (the filter already narrowed branches).

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

**If NIRF rank is known:** add up to +5 points. Rank 1 gets the full bonus; rank 200+ gets none:

```
nirf_bonus = max(0, 5 × (1 − (nirf_rank − 1) / 199))
institute_score = min(100, base + nirf_bonus)
```

**If NIRF is missing:** blend base with competitiveness vs the worst predicted closing rank in the current result set:

```
competitiveness = 1 − (predicted_closing_rank / closing_rank_ceiling)
institute_score = min(100, base × 0.7 + max(0, competitiveness) × 100 × 0.3)
```

Tighter cutoffs (lower rank number) imply stronger demand, so the fallback nudges score up.

## Branch score

Branch names are matched with keyword tiers on `program_id` and `program_name`:

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

First matching tier wins. This is a rough popularity proxy, not a placement or salary model.

> **Info:** Branch scores are static heuristics. They do not read live placement reports or student preferences.

## Sort tie-breakers

When `balanced_score` ties, the sorter falls through:

1. Higher `institute_score`
2. Higher `branch_score`
3. Higher `cumulative_probability`
4. Lower `predicted_closing_rank` (more competitive)

## Other sort modes

The results table also offers:

| Sort key | Behavior |
| --- | --- |
| **Balanced** | Composite score above (default) |
| **Best chance** | Highest cumulative probability first, then closing rank (UI label; internal key `chance`) |
| **Closing rank** | Most competitive programs first |
| **Institute** | Alphabetical by institute, then program |

Balanced scores are recomputed on filtered subsets so competitiveness fallback uses the current result ceiling, not the full national list.
