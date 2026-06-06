# Data release guide

All counselling data lives as versioned parquet under `data/`, pinned by a manifest. When you run the predictor, the response includes `provenance.manifest_version`, `provenance.datasets_used` (each entry is `loaded` or `linked`), and optional `index_lineage` from the index sidecar so you can see what cutoffs built the index.

Read [NOTICE](../NOTICE) before touching datasets. Official JoSAA / CSAB / NTA data stays their property; this repo only ships processed copies for convenience.

<br>

## What's in `data/`

| Dataset | Path pattern | Used by |
|---------|--------------|---------|
| Cutoffs | `data/engineering/jee/{josaa\|csab}/cutoffs/year=YYYY/round=R/cutoffs.parquet` | Index build (linked in provenance via sidecar) |
| Seat matrix | `data/engineering/jee/seats-matrix/jossa/year=YYYY/seat-matrix.parquet` | Registry / transparency only; **not** loaded by the prediction runtime |
| Predictor index | `data/dist/college_predictor_index.parquet` | JEE Main, JEE Advanced |
| CSAB index | `data/dist/csab_predictor_index.parquet` | CSAB |
| Index lineage | `data/dist/*.lineage.json` | Maps each index to cutoff files consumed at build time |
| Registry | `data/registry/engineering/{institutes,programs}.json` | Institute and program metadata; update when new ids show up in cutoffs |

Schemas: `packages/data/src/schema.ts` (`CutoffRow`, `SeatMatrixRow`). Official source URLs: `data/engineering/jee/_sources.json`.

<br>

## Attribution

Personal hobby project. I don't own the counselling or exam data; it's compiled from public NTA, JoSAA, and CSAB releases. See [NOTICE](../NOTICE). Always verify on official portals before making decisions.

<br>

## Get data locally

Parquet files under `data/` ship in git (~4 MB total). After clone, verify your checkout matches the pinned manifest:

```bash
pnpm data:fetch
```

Missing files (sparse clone, etc.):

```bash
pnpm data:fetch --download
```

`--download` pulls the tarball from the GitHub Release tagged `data-{version}`. Override with `EJAM_DATA_RELEASE_URL` if needed.

<br>

## Contributing cutoffs

Official cutoffs only. Cite the JoSAA OR/CR or CSAB notice URL in your PR. If it's a new source, add it to `data/engineering/jee/_sources.json`. No fabricated cutoffs, no paywalled PDFs you can't redistribute.

Seat matrix is optional registry data. The predictor does not load it at runtime.

<br>

## Build and verify

```bash
pnpm build:predictor-index    # JoSAA -> data/dist/college_predictor_index.parquet + .lineage.json
pnpm build:csab-index         # CSAB -> data/dist/csab_predictor_index.parquet + .lineage.json
pnpm generate:manifest --version=vX.Y.Z
pnpm data:fetch
pnpm verify:index-lineage
pnpm validate:data
```

Rebuild indices when cutoff history changes. Changed index hyperparams? Also run `pnpm backtest`.

<br>

## Release checklist

When new counselling rounds land:

1. Add or fix cutoff parquets from official sources.
2. Rebuild predictor indices if history changed.
3. `pnpm generate:manifest --version=vX.Y.Z`
4. `pnpm data:fetch`, `pnpm verify:index-lineage`, `pnpm validate:data`
5. Commit parquets, sidecars, manifest, and any registry fixes.
6. Tag and push: `git tag data-X.Y.Z && git push origin data-X.Y.Z`

Pushing a `data-*` tag runs CI (`.github/workflows/data-release.yml`): verify datasets, package `data-X.Y.Z.tar.gz`, publish the GitHub Release. That's what `pnpm data:fetch --download` uses. Test the tarball locally first with `pnpm package:data-release --version=vX.Y.Z` if you want.

<br>

## Manifest format

Canonical file: `data/manifest/v*.json`

```json
{
  "version": "v0.1.0",
  "generated_at": "2026-04-26T18:35:55Z",
  "git_sha": "abc1234",
  "datasets": [
    {
      "path": "engineering/jee/josaa/cutoffs/year=2025/round=1/cutoffs.parquet",
      "sha256": "...",
      "bytes": 81938
    }
  ]
}
```

Paths omit the `data/` prefix. Deploy gating needs `predictor_index` in the manifest; cutoffs are checksum-validated and linked at runtime through index lineage sidecars.
