# Data release guide

ejam publishes counselling datasets as versioned parquet files pinned by a manifest. Every prediction response includes `provenance.manifest_version`, `provenance.datasets_used` (with `role: loaded | linked`), and optional `index_lineage` from the predictor index sidecar.

## What's included

| Dataset | Path pattern | Used by |
|---------|--------------|---------|
| Cutoffs | `data/engineering/jee/{josaa\|csab}/cutoffs/year=YYYY/round=R/cutoffs.parquet` | Index build (linked in provenance via sidecar) |
| Seat matrix | `data/engineering/jee/seats/matrix/year=YYYY/seat-matrix.parquet` | Optional seat transparency |
| Predictor index | `data/dist/college_predictor_index.parquet` | JEE Main, JEE Advanced |
| CSAB index | `data/dist/csab_predictor_index.parquet` | CSAB |
| Index lineage | `data/dist/*.lineage.json` | Maps each index to cutoff files consumed at build time |

Schemas live in `packages/data/src/schema.ts` (`CutoffRow`, `SeatMatrixRow`).

Official source URLs are listed in `data/engineering/jee/_sources.json`.

## Data attribution

This is a personal hobby project — not a company or official service. I don't
own the counselling or exam data; it's compiled from public NTA, JoSAA, and
CSAB releases. See [NOTICE](../NOTICE) for the full disclaimer. Always verify
on official portals before making decisions.

## Get data locally

After cloning the repo, parquet files under `data/` are included in git (~4 MB total).

Verify your checkout matches the pinned manifest:

```bash
pnpm data:fetch
```

If files are missing (sparse clone or release-only distribution):

```bash
pnpm data:fetch --download
```

`--download` fetches the pinned manifest tarball from the GitHub Release tagged `data-{version}` (override with `EJAM_DATA_RELEASE_URL`).

## Build derived artifacts

```bash
pnpm build:predictor-index   # JoSAA index → data/dist/college_predictor_index.parquet + .lineage.json
pnpm build:csab-index        # CSAB index → data/dist/csab_predictor_index.parquet + .lineage.json
pnpm generate:manifest       # refresh data/manifest/v*.json with sha256 checksums
pnpm data:fetch                # verify integrity
pnpm verify:index-lineage    # assert sidecars match on-disk cutoffs
```

## Post-ingest checklist

1. Ingest new cutoffs or seat matrix from official sources.
2. Rebuild predictor indices when cutoff history changed.
3. Run `pnpm generate:manifest --version=vX.Y.Z`.
4. Run `pnpm data:fetch` and `pnpm verify:index-lineage`.
5. Commit parquet files, sidecars, and updated manifest.
6. Tag a GitHub Release (`data-X.Y.Z`) with a tarball for `--download`.

## Manifest format

Canonical manifest: `data/manifest/v*.json`

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

Paths omit the `data/` prefix. Publish gating requires `predictor_index`; cutoffs are validated in the manifest and linked at runtime via index lineage sidecars.

## Release cadence

Follow the post-ingest checklist above when new counselling rounds land. Bump manifest semver with `generate:manifest --version=vX.Y.Z`.
