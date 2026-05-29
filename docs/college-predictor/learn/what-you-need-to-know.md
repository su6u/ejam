# What you need to know

The predictor only works as well as the inputs. This page covers what to have ready, how JEE counselling fits together, and what the numbers actually mean.

## Before opening the tool

| Topic | What to have ready |
| --- | --- |
| **Counselling rank** | A numeric rank from the relevant counselling, not JEE percentile or marks. Use the rank on the official allotment or rank list. JoSAA allotment is rank-based. |
| **Category and gender** | Match the seat pool on the official portal: OPEN, EWS, OBC-NCL, SC, ST, plus gender-neutral or female-only where applicable. |
| **Quota and home state** | For JEE Main and CSAB, **OS** and **HS** pools need your domicile **home state**. **AI** (All India) does not. Default quota in the UI is **OS**. Pick the same quota you will use in real choice filling. |
| **Counselling body** | JoSAA and CSAB use different institute sets and cutoffs. CSAB runs after JoSAA for vacant NIT+ seats; its cutoffs are typically worse (higher rank numbers) because strong candidates already took JoSAA seats. |

## What ejam is (and is not)

### Open hobby project

ejam is a personal side project, AGPL-licensed, not a company, not an official counselling service, and not endorsed by NTA, JoSAA, CSAB, or any college. Built for **JEE engineering counselling** (JoSAA and CSAB).

### Built from public data

Cutoffs and institute lists come from public JoSAA and CSAB releases. They are cleaned and versioned inside the repo, but errors and lag are still possible.

### Estimates, not guarantees

Each row shows an estimated admission chance from past closing ranks and round history. Seat matrix changes, new rules, and round-to-round shifts can all move real outcomes. See [From rank to results](../how-it-works/from-rank-to-results.md) for how bands and chance are calculated.

### Free to use

The web app and source code are open. There is no paywall on predictions and no account required for the college predictor.

## Exams and institute types

### JEE Main + JoSAA

Typical institute types in results:

- **NIT:** National Institutes of Technology
- **IIIT:** Indian Institutes of Information Technology
- **CFI:** centrally funded institutes in the JoSAA pool

JoSAA's official documents often say **GFTI** (Government Funded Technical Institutes). ejam's index and UI badge use **`CFI`** for the same institute group; same seats, different label.

Quota options: **OS** (Other State), **HS** (Home State), **AI** (All India).

### JEE Main + CSAB

Separate predictor path for CSAB supplementary counselling. Same rank and profile inputs, but the underlying cutoff index is CSAB-only. Institute mix is NIT+, IIIT, and CFI; not IITs.

### JEE Advanced

IIT-only results. Category and gender still matter; quota is handled internally as All India for this exam in the tool.

## EWS: two different things

| Mechanism | What it does |
| --- | --- |
| **Gen-EWS category** (dropdown) | Predicts against **EWS seat rows**, the normal path if you are applying under the EWS category. |
| **`?ews=true` in the URL** (share links) | Runs a **dual comparison**: OPEN seats plus a parallel EWS pass, for General students weighing an EWS certificate. |

Both require official EWS certificate eligibility for real counselling. The dual-comparison mode shows a caveat when active.

