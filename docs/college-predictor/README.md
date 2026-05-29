# College Predictor

Rank + category + quota in → table of colleges and branches from past JoSAA / CSAB cutoffs. Sort by chance, closing rank, or institute.

Estimates only. Real choice filling happens on official portals.

App route: `/college-predictor`

## Contents

| Section | Purpose |
| --- | --- |
| [Learn](#learn) | First run and inputs |
| [How it works](#how-it-works) | Pipeline, rank → chance, bands |
| [Nerd stuff](#nerd-stuff) | Formulas and index build |
| [FAQs](#faqs) | Short answers |

## Learn

| Page | Purpose |
| --- | --- |
| [Getting started](learn/getting-started.md) | Open the tool, exam routing, first prediction |
| [What you need to know](learn/what-you-need-to-know.md) | Rank, quota, GFTI vs CFI, disclaimers |

## How it works

| Page | Purpose |
| --- | --- |
| [Overview](how-it-works/overview.md) | Cutoffs → index → API → results |
| [From rank to results](how-it-works/from-rank-to-results.md) | Chance, bands, closing rank, sorting |

## Nerd stuff

| Page | Purpose |
| --- | --- |
| [Prediction engine](nerd-stuff/prediction-engine.md) | CDF math, round probabilities, band thresholds |
| [Index algorithms](nerd-stuff/index-algorithms.md) | DuckDB build, `jam-josaa-v2`, `jam-csab-v2` |
| [Balanced ranking](nerd-stuff/balanced-ranking.md) | Institute × branch × chance score |

## FAQs

| Page | Purpose |
| --- | --- |
| [FAQs](faqs/faqs.md) | Common questions |

## Full page list

- [Getting started](learn/getting-started.md)
- [What you need to know](learn/what-you-need-to-know.md)
- [Overview](how-it-works/overview.md)
- [From rank to results](how-it-works/from-rank-to-results.md)
- [Prediction engine](nerd-stuff/prediction-engine.md)
- [Index algorithms](nerd-stuff/index-algorithms.md)
- [Balanced ranking](nerd-stuff/balanced-ranking.md)
- [FAQs](faqs/faqs.md)

[← Back to ejam docs](../README.md)
