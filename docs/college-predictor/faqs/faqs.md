# FAQs

Quick answers about how ejam works and what to expect. For formulas and pipeline detail, see [Prediction engine](../nerd-stuff/prediction-engine.md) and [Index algorithms](../nerd-stuff/index-algorithms.md).

> **Warning:** This is a hobby project, not an official NTA, JoSAA, or CSAB service. Always confirm ranks, eligibility, and seat counts on government portals before locking choices.

## About predictions

<details>
<summary>Does a Safe band mean a guaranteed seat?</summary>

No. **Safe** means the model gives roughly 85%+ cumulative chance based on past cutoffs and the stated rank. Cutoffs shift every year. New seats, category changes, and choice-filling order can all move the line.

</details>

<details>
<summary>How accurate are the numbers?</summary>

Accuracy depends on how stable that program's cutoff history is. Rows labeled `sufficient` (3+ years of data) tend to be steadier. `inferred` (2 years) and `pooled` (1 year) carry more uncertainty, and the index inflates `sigma_effective` for sparse rows. The builders are backtested on held-out years, but backtest performance is not a promise for the current year.

</details>

<details>
<summary>Why might results differ from other predictors?</summary>

Different sites use different years, formulas, or category matching. ejam uses published `jam-josaa-v2` / `jam-csab-v2` algo logic, round-weighted JoSAA anchors, explicit pool shift on JoSAA only, and a normal-CDF chance model. Another site might use last year's cutoff as a hard cutoff with no probability band.

</details>

<details>
<summary>Why are some colleges missing?</summary>

A program must exist in the cutoff dataset for the selected seat type, gender, and quota. Brand-new programs, rare quota combinations, or rows filtered out by home-state quota rules will not appear. Try toggling filters or checking whether that combination existed in recent JoSAA/CSAB data.

</details>

## Ranks and inputs

<details>
<summary>Which rank should be entered?</summary>

Use the counselling rank for the exam being predicted: JEE Main rank for NIT / IIIT / CFI (JoSAA or CSAB), JEE Advanced rank for IIT (JoSAA). Do not mix Main and Advanced ranks across predictors. Allotment is rank-based, not percentile-based.

</details>

<details>
<summary>What are the rank limits?</summary>

JEE Main and CSAB accept ranks from 1 to **500,000**. JEE Advanced accepts 1 to **50,000**.

</details>

<details>
<summary>What do Safe, Target, Reach, and Long-shot mean?</summary>

Chance bands group rows by estimated admission probability. Full thresholds and how chance is computed: [From rank to results](../how-it-works/from-rank-to-results.md).

</details>

<details>
<summary>Why are Long-shots hidden by default?</summary>

Programs below 10% chance clutter the list. Append `include_all=true` to the URL (or API request) to include them. Band filters only narrow what the API already returned.

</details>

<details>
<summary>What is predicted closing rank on each row?</summary>

It is the index's forecast of where that seat might close this year, built from weighted history, capped trend, and (for JoSAA) pool shift. It is not last year's cutoff copied forward. Probability compares **student rank** to this forecast using `sigma_effective`.

</details>

<details>
<summary>Why is the Predict button disabled after I run once?</summary>

After a successful prediction, the button stays disabled until **any** input changes: rank, category, gender, quota, home state, exam, or counselling. Change something to re-run. Sidebar filters do not require clicking Predict again.

</details>

## Categories and quotas

<details>
<summary>Why does the tool ask for home state?</summary>

For **HS** (Home State) and **OS** (Other State) quotas on JEE Main and CSAB, seat rows depend on whether the institute is in the student's home state. HS seats go to students from that state; OS seats go to students from other states. **AI** (All India) ignores home state for matching. Default quota is **OS**.

</details>

<details>
<summary>What about EWS?</summary>

Two separate mechanisms:

1. **Gen-EWS** in the category dropdown: predicts against EWS seat rows (normal path if you apply under EWS).
2. **`?ews=true` in the URL:** dual OPEN + EWS comparison for General students weighing a certificate.

Both require official EWS certificate eligibility for real counselling. The dual-comparison mode shows a caveat when active.

</details>

<details>
<summary>What is GFTI vs CFI?</summary>

JoSAA official documents use **GFTI** (Government Funded Technical Institutes). ejam's index and UI badge use **CFI** for the same institute group. Same seats, different label.

</details>

<details>
<summary>What is the difference between JEE Main, JEE Advanced, and CSAB in the app?</summary>

- **JEE Main + JoSAA**: Non-IIT institutes (NIT, IIIT, CFI/GFTI) via the JoSAA six-round process
- **JEE Advanced**: IIT only, AI quota
- **CSAB**: Supplementary counselling after JoSAA for vacant seats; separate cutoff history and index; typically worse (higher) closing ranks

</details>

## Share links

<details>
<summary>How do share links work?</summary>

All main inputs sync to the URL: `rank`, `exam`, `counselling`, `category`, `gender`, `quota`, `state`, `ews`, `include_all`. When the URL is complete on load, the app **auto-runs** the prediction. Legacy links at `/` with these params redirect to `/college-predictor`.

</details>

## Data and the project

<details>
<summary>Where does the data come from?</summary>

Public JoSAA and CSAB cutoff releases, compiled into parquet files under `data/engineering/jee/`. Source URLs are listed in `data/engineering/jee/_sources.json`. NIRF ranks and institute metadata come from the repo registry (`institutes.json`, `programs.json`).

</details>

<details>
<summary>Can the data be trusted?</summary>

Cutoffs are transcribed from official PDFs and notices. Errors and lag happen. Each API response includes provenance (manifest version, datasets used). For release mechanics and checksums, see [DATA.md](../DATA.md).

</details>

<details>
<summary>Is ejam free?</summary>

**Yes.** The college predictor is free to use: no account, no paywall, no payment step. Source code is open under AGPL. ejam is a personal hobby project, not affiliated with NTA, JoSAA, CSAB, or any institute.

</details>

<details>
<summary>What does Balanced sort do?</summary>

Default sort multiplies institute quality, branch desirability heuristics, and admission chance into one score. It is a navigation aid, not an official ranking of colleges. Switch to **Best chance** or **Closing rank** sort for pure probability or competitiveness ordering. Details: [Balanced ranking](../nerd-stuff/balanced-ranking.md).

</details>

<details>
<summary>What do the round bars on each row mean?</summary>

Six bars map to JoSAA-style rounds 1–6. Each bar height reflects cumulative probability through that round. After the program's typical `fill_round`, later bars freeze. The percentage label is the average cumulative chance from round 1 through `fill_round`.

</details>

## More reading

| Guide | Description |
| --- | --- |
| [Overview](../how-it-works/overview.md) | End-to-end pipeline. |
| [From rank to results](../how-it-works/from-rank-to-results.md) | Bands, chance, closing rank. |
| [Prediction engine](../nerd-stuff/prediction-engine.md) | Runtime math and round probabilities. |
| [Index algorithms](../nerd-stuff/index-algorithms.md) | Offline index build. |
| [Data pipeline](../DATA.md) | Fetch, verify, and rebuild datasets locally. |
