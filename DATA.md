# Data release guide

ejam publishes counselling datasets as versioned parquet files pinned by a manifest. Every prediction response includes `provenance.manifest_version` and `provenance.datasets_used` with sha256 checksums.

## What's included

| Dataset | Path pattern | Used by |
|---------|--------------|---------|
| Cutoffs | `data/engineering/jee/{josaa\|csab}/cutoffs/year=YYYY/round=R/cutoffs.parquet` | Dependency gating, backtests |
| Seat matrix | `data/engineering/jee/seats/matrix/year=YYYY/seat-matrix.parquet` | Optional transparency |
| Predictor index | `data/dist/college_predictor_index.parquet` | JEE Main, JEE Advanced |
| CSAB index | `data/dist/csab_predictor_index.parquet` | CSAB |

Schemas live in `packages/data/src/schema.ts` (`CutoffRow`, `SeatMatrixRow`).

Official source URLs are listed in `data/engineering/jee/_sources.json`.

## Get data locally

After cloning the repo, parquet files under `data/` are included in git (~4 MB total).

Verify your checkout matches the pinned manifest:

```bash
pnpm data:fetch
```

If files are missing (sparse clone or future release-only distribution):

```bash
pnpm data:fetch --download
```

Set `EJAM_DATA_RELEASE_URL` to override the default GitHub release tarball URL.

## Build derived artifacts

```bash
pnpm build:predictor-index   # JoSAA index → data/dist/college_predictor_index.parquet
pnpm generate:manifest         # refresh data/manifest/v*.json with sha256 checksums
pnpm data:fetch                # verify integrity
```

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

Paths omit the `data/` prefix. The dependency resolver maps exam config `path_template` values to manifest entries and gates the predict API when required datasets are missing.

## Release cadence

1. Ingest new cutoffs or seat matrix from official sources.
2. Rebuild predictor indices if cutoff history changed.
3. Run `pnpm generate:manifest --version=vX.Y.Z`.
4. Run `pnpm data:fetch` to verify.
5. Commit parquet files + updated manifest.
6. Optionally tag a GitHub Release (`data-X.Y.Z`) with a tarball for `--download`.
