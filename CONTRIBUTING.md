# Contributing to ejam

ejam is a personal hobby project, open source under [AGPL-3.0-or-later](LICENSE). Contributions are welcome: code, data fixes, docs, and bug reports.

Read [NOTICE](NOTICE) before touching datasets. Official JoSAA / CSAB / NTA data stays their property; this repo only ships processed copies for convenience.

## Ways to help

| Area | Examples |
| --- | --- |
| **Web app** | College predictor UI, accessibility, share links, empty states |
| **Prediction logic** | Engine, predictors, balanced ranking, band thresholds |
| **Data** | New cutoff rounds, corrected OR/CR, manifest bumps, index rebuilds |
| **Docs** | `docs/` user guides and `docs/DATA.md` for maintainers |
| **Issues** | Wrong cutoff, missing institute, confusing copy, reproducible bugs |

Not sure where to start? Open an issue with what you found. Small, focused PRs are easier to review than large rewrites.

## Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 22+ |
| pnpm | 11.1.3 (see root `packageManager`) |
| uv | For Python data validation (`packages/data-validation`) |

Optional: DuckDB bindings install with `@ejam/data-cli` when building predictor indices locally.

## Local setup

```bash
git clone https://github.com/su6u/ejam.git
cd ejam
pnpm install
pnpm data:fetch          # verify pinned parquet checksums
pnpm dev                 # runs the monorepo dev graph (web app included)
```

Web app lives in `apps/web`. College predictor route: `/college-predictor`.

Sparse clone or missing parquets:

```bash
pnpm data:fetch --download
```

## Repository layout

```
apps/web/              Next.js UI + /api/predict/{exam_id}
packages/data/         Schemas, probability engine, manifest loading
packages/predictors/   jee-main, jee-advanced, csab exam modules
packages/data-cli/     Index build, manifest, fetch, backtest
packages/data-validation/  Python parquet + JSON checks
data/                  Cutoff parquets, registry, manifest, dist indices
docs/                  User and maintainer documentation
```

Prediction flow: cutoff parquets → offline index build → parquet index → API loads index → `predictPrograms()` → JSON response with provenance.

Technical docs: [docs/college-predictor/README.md](docs/college-predictor/README.md).

## Before you open a PR

From the repo root:

```bash
pnpm typecheck
pnpm check              # Biome lint + format check
pnpm build
```

If you changed anything under `data/` or index builders:

```bash
pnpm data:fetch
pnpm verify:index-lineage
pnpm validate:data
pnpm --filter @ejam/data test
```

CI runs the app and data jobs based on which paths changed (see `.github/workflows/ci.yml`). Passing **app** on `main` triggers production deploy via the CI deploy job

Fix lint automatically when safe:

```bash
pnpm check:write
```

## Contribution guidelines

### Scope and style

- Match existing patterns in the file you edit. No drive-by refactors.
- Keep changes tied to one concern per PR when possible.
- Biome is the formatter and linter; TypeScript strictness applies per package.
- User-facing copy: plain language, no filler. Docs live under `docs/`.

### Code contributions

**UI / API (`apps/web`, `packages/predictors`)**

- Predictor state syncs to URL query params; test share links and auto-predict on load.
- API contract types live in `packages/data/src/predictor-interface.ts`.
- Exam routing: `jee-main`, `jee-advanced`, `csab` via `packages/predictors/src/registry.ts`.

**Engine / ranking (`packages/data`)**

- Band thresholds and CDF logic: `packages/data/src/college-predictor/engine.ts`
- Balanced sort: `packages/data/src/college-predictor/balanced-ranking.ts`
- Add or update tests in `packages/data/src/__tests__/`.

**Index build (`packages/data-cli`)**

- JoSAA: `jam-josaa-v2` in `build-college-predictor-index.ts` + `jam/config.ts`
- CSAB: `jam-csab-v2` in `build-csab-predictor-index.ts` + `jam/csab-config.ts`
- After changing hyperparameters, run backtest if you know the baseline: `pnpm backtest`

### Data contributions

Official cutoffs only. Cite the source URL in the PR (JoSAA OR/CR page, CSAB notice, etc.).

Typical flow:

1. Add or fix parquet under `data/engineering/jee/...`
2. Rebuild indices: `pnpm build:predictor-index` and/or `pnpm build:csab-index`
3. Regenerate manifest: `pnpm generate:manifest --version=vX.Y.Z`
4. Verify: `pnpm data:fetch`, `pnpm verify:index-lineage`, `pnpm validate:data`
5. Commit parquets, sidecars, manifest, and any registry fixes together

Full checklist: [docs/DATA.md](docs/DATA.md).

Do not commit scraped personal data, paywalled PDFs you do not have rights to redistribute, or fabricated cutoffs.

### Documentation

- Root index: [docs/README.md](docs/README.md)
- College predictor: [docs/college-predictor/](docs/college-predictor/)
- Edit the page that matches your change; avoid duplicating band tables and pipeline explanations across files.

## Pull requests

1. Fork and branch from `main`.
2. Describe **what** changed and **why**. Link an issue if one exists.
3. For data PRs: list source URLs, manifest version bump, and whether indices were rebuilt.
4. Confirm checks pass (or note what you could not run locally).
5. AGPL applies to merged code. By submitting a PR, you agree your contribution is licensed under the same terms as the project.

There is no paid support team and no SLA. Reviews happen when time allows.

## Reporting bugs

Include:

- Rank, exam, counselling, category, quota, gender (sanitized screenshot or URL is fine)
- Expected vs actual row or cutoff
- Data version from the results footer if visible
- Browser / OS if UI-specific

For wrong cutoffs, official OR/CR link for that year and round beats a screenshot alone.

## Security

Do not open public issues for sensitive production secrets. If you find a serious vulnerability, contact the maintainer privately.

## License reminder

AGPL-3.0 covers **this project's code**. Running a modified version as a network service requires offering corresponding source to users. Bundled counselling data remains subject to the original publishers' terms; see [NOTICE](NOTICE).

Thank you for helping keep a JEE counselling tool open, inspectable, and free to use.
