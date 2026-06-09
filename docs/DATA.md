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

## Get Data Locally

Parquet files under `data/` do not ship in git. Git tracks manifests, registry/config metadata, and source attribution; release payloads live in GitHub Releases.

```bash
pnpm data:fetch --download
```

`--download` pulls the tarball from the GitHub Release tagged `data-{version}` and verifies every manifest checksum. Override with `EJAM_DATA_RELEASE_URL` if needed.

If you already have local data and only want to verify it:

```bash
pnpm data:fetch
```

<br>

## Adding data

Git tracks manifests, registry/config metadata, and source attribution. Parquet payloads live in GitHub Releases as `data-X.Y.Z.tar.gz`, pinned by `data/manifest/vX.Y.Z.json`. Local dev, CI, and Vercel all hydrate `data/` with `pnpm data:fetch --download`.

Official cutoffs only. Cite the JoSAA OR/CR or CSAB notice URL in your PR. If it's a new source, add it to `data/engineering/jee/_sources.json`. No fabricated cutoffs, no paywalled PDFs you can't redistribute. Seat matrix is optional registry data; the predictor does not load it at runtime.

### Where to put files

Follow the path patterns in the table above. Examples:

```text
data/engineering/jee/josaa/cutoffs/year=2026/round=1/cutoffs.parquet
data/engineering/jee/csab/cutoffs/year=2026/round=1/cutoffs.parquet
data/engineering/jee/seats-matrix/jossa/year=2026/seat-matrix.parquet
```

Index outputs land in `data/dist/` after you run the build commands below — don't hand-edit those unless you know what you're doing.

### What goes in git

| Commit in PR | Keep local only |
|--------------|-----------------|
| `data/manifest/vX.Y.Z.json` | `data/engineering/**/*.parquet` |
| `data/registry/**` (if institute/program ids changed) | `data/dist/*.parquet` |
| `data/engineering/jee/_sources.json` (if sources changed) | `data/dist/*.lineage.json` |
| docs, if you touched them | anything under `_raw/` |

Parquet files stay on disk for your build but are gitignored. The manifest checksums are how CI and other machines get the same bytes from the release tarball.

### Contributor steps

1. **Start from current data**

   ```bash
   pnpm data:fetch --download
   ```

2. **Add or fix parquets** from official sources at the paths above.

3. **Update metadata** when needed — new ids in `data/registry/engineering/`, new URLs in `_sources.json`.

4. **Rebuild indices** if cutoff history changed:

   ```bash
   pnpm build:predictor-index
   pnpm build:csab-index
   ```

5. **Bump the manifest** — pick a new semver, e.g. `v0.1.2`:

   ```bash
   pnpm generate:manifest --version=v0.1.2
   ```

6. **Verify locally**:

   ```bash
   pnpm data:fetch --version=v0.1.2
   pnpm verify:index-lineage
   pnpm validate:data
   pnpm --filter @ejam/data test
   ```

   Changed index hyperparams? Also run `pnpm backtest`.

7. **Open a PR** with manifest + registry + source attribution only. Mention the official source URL(s) in the PR description. You don't need to attach parquets — the manifest lists every file path and sha256.

<br>

## Build and verify

Quick reference — full walkthrough in [Adding data](#adding-data):

```bash
pnpm build:predictor-index    # JoSAA -> data/dist/college_predictor_index.parquet + .lineage.json
pnpm build:csab-index         # CSAB -> data/dist/csab_predictor_index.parquet + .lineage.json
pnpm generate:manifest --version=vX.Y.Z
pnpm data:fetch --version=vX.Y.Z
pnpm verify:index-lineage
pnpm validate:data
```

Changed index hyperparams? Also run `pnpm backtest`.

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
