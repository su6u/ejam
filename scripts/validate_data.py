"""
validates jee json and published parquet files under data/

usage: uv run python scripts/validate_data.py
exit 0 = clean, 1 = issues found
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

from validate_jee_json import main as validate_json_main

try:
    import polars as pl
except ModuleNotFoundError:
    print("ERROR: polars required — install with: uv sync")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_ROOT = ROOT / "data" / "registry"
ENGINEERING_ROOT = ROOT / "data" / "engineering"
DIST_ROOT = ROOT / "data" / "dist"

DUAL_CLASS_OK = {"iiest-shibpur"}

INSTYPE_PREFIX_RULES: dict[str, set[str]] = {
    "iit-": {"IIT"},
    # raw cutoffs use 3IT; some IIIT slugs are classified CFI in JoSAA/CSAB
    "iiit-": {"IIIT", "3IT", "CFI"},
    "nit-": {"NIT"},
}

INSTYPE_ALIASES = {"3IT": "IIIT"}

CUTOFF_COLUMNS = (
    "year",
    "round",
    "institute_id",
    "program_id",
    "quota",
    "seat_type",
    "gender",
    "opening_rank",
    "closing_rank",
    "rank_exam",
    "instype",
    "degree",
    "duration_years",
    "source",
    "source_id",
    "run_id",
    "source_locator",
)

SEAT_MATRIX_COLUMNS = (
    "year",
    "institute_id",
    "program_id",
    "quota",
    "seat_type",
    "gender",
    "seats",
    "source",
)

PREDICTOR_INDEX_COLUMNS = (
    "institute_id",
    "program_id",
    "seat_type",
    "quota",
    "gender",
    "instype",
    "degree",
    "duration_years",
    "weighted_mean",
    "weighted_std",
    "trend_slope",
    "sigma_base",
    "sigma_effective",
    "predicted_closing_rank",
    "data_quality",
    "years_of_data",
    "last_data_year",
    "min_closing_rank",
    "max_closing_rank",
    "fill_round",
)

DATA_QUALITY_VALUES = {"pooled", "inferred", "sufficient"}


class Report:
    def __init__(self) -> None:
        self.issues: list[str] = []

    def add(self, msg: str) -> None:
        self.issues.append(msg)
        print(f"  ✗ {msg}")


def load_registry_ids() -> set[str]:
    domain_dir = REGISTRY_ROOT / "engineering"
    inst_path = domain_dir / "institutes.json"
    if not inst_path.exists():
        return set()
    return {i["id"] for i in json.loads(inst_path.read_text())}


def discover_parquet_files() -> list[Path]:
    files: list[Path] = []
    if ENGINEERING_ROOT.exists():
        files.extend(sorted(ENGINEERING_ROOT.rglob("*.parquet")))
    for name in ("college_predictor_index.parquet", "csab_predictor_index.parquet"):
        path = DIST_ROOT / name
        if path.exists():
            files.append(path)
    return files


def classify_file(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel.endswith("/cutoffs.parquet"):
        return "cutoff"
    if "seats/matrix" in rel and path.name == "seat-matrix.parquet":
        return "seat_matrix"
    if path.parent.name == "dist" and path.name.endswith("_predictor_index.parquet"):
        return "predictor_index"
    return "unknown"


def check_required_columns(
    df: pl.DataFrame,
    required: tuple[str, ...],
    rep: Report,
    label: str,
) -> None:
    missing = [col for col in required if col not in df.columns]
    if missing:
        rep.add(f"{label}: missing columns {missing}")


def check_registry_validity(
    df: pl.DataFrame,
    inst_ids: set[str],
    rep: Report,
    label: str,
) -> None:
    if inst_ids and "institute_id" in df.columns:
        bad = df.filter(~pl.col("institute_id").is_in(list(inst_ids)))
        if len(bad) > 0:
            rep.add(f"{label}: {len(bad)} rows with unknown institute_id")


def check_instype_collisions(df: pl.DataFrame, rep: Report, label: str) -> None:
    if "instype" not in df.columns or "institute_id" not in df.columns:
        return
    for prefix, allowed in INSTYPE_PREFIX_RULES.items():
        cond = pl.col("institute_id").str.starts_with(prefix)
        if prefix == "iit-":
            cond = cond & ~pl.col("institute_id").str.starts_with("iiit-")
        bad = df.filter(cond & ~pl.col("instype").is_in(list(allowed)))
        if len(bad) > 0:
            sample = bad.select(["institute_id", "instype"]).unique().to_dicts()[:3]
            rep.add(f"{label}: {prefix}* slug under wrong instype (allowed={allowed}): {sample}")


def check_duplicates(df: pl.DataFrame, key_cols: list[str], rep: Report, label: str) -> None:
    available = [c for c in key_cols if c in df.columns]
    if len(available) != len(key_cols):
        return
    dupes = df.group_by(available).len().filter(pl.col("len") > 1)
    if len(dupes) > 0:
        rep.add(f"{label}: {len(dupes)} duplicate row groups on {available}")


def check_cutoff_rows(df: pl.DataFrame, rep: Report, label: str) -> None:
    if "rank_exam" in df.columns:
        bad = df.filter(pl.col("rank_exam").is_null() | (pl.col("rank_exam") == ""))
        if len(bad) > 0:
            rep.add(f"{label}: {len(bad)} rows with missing rank_exam")
    if "opening_rank" in df.columns and "closing_rank" in df.columns:
        negative = df.filter((pl.col("opening_rank") < 0) | (pl.col("closing_rank") < 0))
        if len(negative) > 0:
            rep.add(f"{label}: {len(negative)} rows with negative ranks")
        bad_order = df.filter(pl.col("opening_rank") > pl.col("closing_rank"))
        if len(bad_order) > 0:
            rep.add(f"{label}: {len(bad_order)} rows where opening_rank > closing_rank")


def check_seat_matrix_rows(df: pl.DataFrame, rep: Report, label: str) -> None:
    if "seats" not in df.columns:
        return
    bad = df.filter(pl.col("seats") < 0)
    if len(bad) > 0:
        rep.add(f"{label}: {len(bad)} rows with negative seats")


def check_predictor_index_rows(df: pl.DataFrame, rep: Report, label: str) -> None:
    if "data_quality" in df.columns:
        bad = df.filter(~pl.col("data_quality").is_in(list(DATA_QUALITY_VALUES)))
        if len(bad) > 0:
            rep.add(f"{label}: {len(bad)} rows with invalid data_quality")
    if "predicted_closing_rank" in df.columns:
        bad = df.filter(pl.col("predicted_closing_rank") <= 0)
        if len(bad) > 0:
            rep.add(f"{label}: {len(bad)} rows with non-positive predicted_closing_rank")


def cast_string_cols(df: pl.DataFrame) -> pl.DataFrame:
    target = (
        "institute_id",
        "program_id",
        "quota",
        "seat_type",
        "gender",
        "rank_exam",
        "instype",
        "data_quality",
    )
    casts = [pl.col(col).cast(pl.String) for col in target if col in df.columns]
    return df.with_columns(casts) if casts else df


def normalize_instype(instype: str) -> str:
    return INSTYPE_ALIASES.get(instype, instype)


def validate_file(
    path: Path,
    kind: str,
    inst_ids: set[str],
    slug_instype_map: dict[str, set[str]],
    rep: Report,
) -> None:
    label = path.relative_to(ROOT).as_posix()
    print(f"\n{label} [{kind}]")
    df = cast_string_cols(pl.read_parquet(path))

    if kind == "cutoff":
        check_required_columns(df, CUTOFF_COLUMNS, rep, label)
        check_registry_validity(df, inst_ids, rep, label)
        check_instype_collisions(df, rep, label)
        check_duplicates(
            df,
            [
                "year",
                "round",
                "institute_id",
                "program_id",
                "quota",
                "seat_type",
                "gender",
                "degree",
                "duration_years",
            ],
            rep,
            label,
        )
        check_cutoff_rows(df, rep, label)
    elif kind == "seat_matrix":
        check_required_columns(df, SEAT_MATRIX_COLUMNS, rep, label)
        check_registry_validity(df, inst_ids, rep, label)
        check_seat_matrix_rows(df, rep, label)
    elif kind == "predictor_index":
        check_required_columns(df, PREDICTOR_INDEX_COLUMNS, rep, label)
        check_registry_validity(df, inst_ids, rep, label)
        check_instype_collisions(df, rep, label)
        check_duplicates(
            df,
            ["institute_id", "program_id", "quota", "seat_type", "gender"],
            rep,
            label,
        )
        check_predictor_index_rows(df, rep, label)
    else:
        rep.add(f"{label}: unknown parquet kind")

    if "instype" in df.columns and "institute_id" in df.columns:
        for row in df.select(["institute_id", "instype"]).unique().to_dicts():
            slug_instype_map[row["institute_id"]].add(normalize_instype(row["instype"]))


def validate_parquet_files() -> int:
    rep = Report()
    files = discover_parquet_files()
    if not files:
        print("no parquet files found under data/engineering or data/dist")
        return 0

    inst_ids = load_registry_ids()
    slug_instype_map: dict[str, set[str]] = defaultdict(set)

    print(f"validating {len(files)} parquet files")
    for path in files:
        validate_file(path, classify_file(path), inst_ids, slug_instype_map, rep)

    inconsistent = {s: t for s, t in slug_instype_map.items() if len(t) > 1 and s not in DUAL_CLASS_OK}
    if inconsistent:
        rep.add(f"cross-file instype inconsistency: {inconsistent}")

    print("\n" + "=" * 60)
    if rep.issues:
        print(f"FAIL — {len(rep.issues)} issue(s)")
        return 1
    print("ALL CHECKS PASSED")
    return 0


def main() -> int:
    print("=" * 60)
    print("JEE JSON")
    print("=" * 60)
    json_failed = validate_json_main() != 0

    print("\n" + "=" * 60)
    print("PARQUET")
    print("=" * 60)
    parquet_failed = validate_parquet_files() != 0

    print("\n" + "=" * 60)
    if json_failed or parquet_failed:
        print("FAIL")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
