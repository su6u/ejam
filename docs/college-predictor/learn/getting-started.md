# Getting started

ejam is an open-source (AGPL) tool for **JEE engineering counselling**. The **College Predictor** returns a rank-based list of likely college and branch options from historical JoSAA and CSAB cutoffs. Not an official allotment service.

## JEE counselling in one minute

| Body | When | Institutes |
| --- | --- | --- |
| **JoSAA** | After JEE Main / Advanced results | IITs (Advanced rank), NITs, IIITs, GFTIs |
| **CSAB** | After JoSAA rounds, for vacant seats | NIT+, IIIT, CFI; separate cutoffs from JoSAA |

JoSAA runs up to **six rounds** with freeze / float / slide options. At NITs, **HS** (Home State) and **OS** (Other State) quotas depend on where the institute is versus where you are domiciled. Allotment uses your **counselling rank** (a number), not percentile.

The predictor compares your rank to historical closing ranks and labels each option with a chance band. Those are **estimates**; cutoffs move every year.

## Exam routing

```mermaid
flowchart TD
    A[Open College Predictor] --> B{Choose exam}
    B -->|JEE Main| C{Counselling body}
    C -->|JoSAA| D[Non-IIT institutes via college_predictor_index]
    C -->|CSAB| E[Supplementary counselling via csab_predictor_index]
    B -->|JEE Advanced| F[IIT-only via college_predictor_index]
    D --> G[Enter rank and profile]
    E --> G
    F --> H[Enter rank, category, gender]
    G --> I[Click Predict colleges]
    H --> I
    I --> J[View and filter results]
```

## Steps

1. **Open ejam**  
   Go to `/college-predictor` (the home page `/` redirects here when a share link includes predictor query params). You can also open College Predictor from the tools grid on the home page.

2. **Pick an exam**

   ### JEE Main

   Covers NITs, IIITs, and other centrally funded institutes through **JoSAA** or **CSAB** counselling. JoSAA is the main six-round process; CSAB is supplementary counselling for seats still vacant after JoSAA.

   ### JEE Advanced

   Covers **IITs only**. Quota and home-state fields are hidden; IIT JoSAA counselling uses All India quota in this tool.

3. **Enter rank and profile**

   Fill in:

   - **Rank:** counselling rank as a plain integer (not percentile, not marks). Caps: up to **500,000** for JEE Main and CSAB, **50,000** for JEE Advanced.
   - **Category:** General, Gen-EWS, OBC-NCL, SC, or ST (maps to official seat types).
   - **Gender:** Neutral or Female (includes supernumerary seats where data exists).

   For JEE Main, also set:

   - **Quota:** OS (default), HS, or AI
   - **Counselling:** JoSAA or CSAB
   - **Home state:** required when quota is OS or HS (your domicile state for seat-pool matching)

4. **Run the prediction**  
   Click **Predict colleges**. Results load in the main table. Inputs sync to the URL so the link can be bookmarked or shared.

   **Share links:** If the URL already contains a valid setup (rank plus required fields), the page **auto-runs** the prediction on load. Main params: `rank`, `exam`, `counselling`, `category`, `gender`, `quota`, `state`, `ews`, `include_all`.

5. **Filter and sort**  
   After results load, narrow by institute type or band in the sidebar. Change sort above the table (Balanced, Best chance, Closing rank, Institute). Click a row for round-by-round detail.

## Next steps

| Guide | Description |
| --- | --- |
| [What you need first](what-you-need-to-know.md) | Rank, category, quota rules, GFTI vs CFI. |
| [How it works](../how-it-works/overview.md) | What the predictor does under the hood. |
| [From rank to results](../how-it-works/from-rank-to-results.md) | Bands, chance column, closing rank. |

> **Warning:** A prediction is a rough estimate from historical cutoffs. It is not a seat allotment guarantee. Official JoSAA, CSAB, and NTA portals stay the source of truth.
