# What you need to know

Garbage in, garbage out. This page is what to have ready before running the predictor, how JEE counselling fits together, and what the numbers mean.

## Before opening the tool

| Topic | What to have ready |
| --- | --- |
| **Counselling rank** | Numeric rank from the relevant counselling, not JEE percentile or marks. Use the rank on the official allotment or rank list. |
| **Category and gender** | Match the seat pool on the official portal: OPEN, EWS, OBC-NCL, SC, ST, plus gender-neutral or female-only where applicable. |
| **Quota and home state** | For JEE Main and CSAB, **OS** and **HS** need domicile **home state**. **AI** (All India) does not. Default quota in the UI is **OS**. Pick the same quota used in real choice filling. |
| **Counselling body** | JoSAA and CSAB use different institute sets and cutoffs. CSAB runs after JoSAA for vacant NIT+ seats; cutoffs are usually worse (higher rank numbers) because strong candidates already took JoSAA seats. |

## What this is (and is not)

**Hobby project.** AGPL, not a company, not official counselling, not endorsed by NTA/JoSAA/CSAB/any college. Built for JEE engineering counselling (JoSAA and CSAB).

**Public data.** Cutoffs and institute lists from official JoSAA and CSAB releases, cleaned and versioned in the repo. Typos and lag still happen.

**Estimates, not guarantees.** Each row is an estimated admission chance from past closing ranks and round history. Seat matrix changes, new rules, and round shifts can move real outcomes. Band math: [From rank to results](../how-it-works/from-rank-to-results.md).

**Free.** No paywall, no account for the college predictor.

## Exams and institute types

### JEE Main + JoSAA

Typical institute types in results:

- **NIT:** National Institutes of Technology
- **IIIT:** Indian Institutes of Information Technology
- **CFI:** centrally funded institutes in the JoSAA pool

JoSAA PDFs often say **GFTI**. ejam uses **CFI** for the same group in the index and UI badge. Same seats, different acronym.

Quota: **OS**, **HS**, **AI**.

### JEE Main + CSAB

Separate CSAB predictor index. Same rank/profile inputs, CSAB cutoff history only. NIT+, IIIT, CFI. No IITs.

### JEE Advanced

IIT-only. Category and gender still matter; quota is All India internally for this exam in the tool.

## EWS: two different things

| Mechanism | What it does |
| --- | --- |
| **Gen-EWS category** (dropdown) | Predicts against **EWS seat rows**. Normal path when applying under EWS. |
| **`?ews=true` in the URL** | Dual comparison: OPEN seats plus a parallel EWS pass, for General students weighing an EWS certificate. |

Both assume real EWS certificate eligibility for counselling. Dual mode shows a caveat when active.
