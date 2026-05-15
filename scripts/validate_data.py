"""
data integrity validator — walks every domain under data/<domain>/ and verifies
all published Parquet files against the contract in docs/data/contract.md

usage: uv run python scripts/validate_data.py
exit 0 = clean, 1 = issues found
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

try:
    import polars as pl
except ModuleNotFoundError:
    print("ERROR: polars required — install with: uv pip install polars")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_ROOT = ROOT / "data" / "registry"

# slugs that legitimately appear under multiple instype values across sources
DUAL_CLASS_OK = {"iiest-shibpur"}

# domain-specific instype prefix rules — slug prefix → expected instype set
INSTYPE_PREFIX_RULES: dict[str, dict[str, set[str]]] = {
    "engineering": {
        "iit-": {"IIT"},
        "iiit-": {"IIIT"},
        "nit-": {"NIT"},
    },
}


class Report:
    def __init__(self) -> None:
        self.issues: list[str] = []

    def add(self, msg: str) -> None:
        self.issues.append(msg)
        print(f"  ✗ {msg}")


def load_registry_ids(domain_dir: Path) -> tuple[set[str], set[str]]:
    """return (institute_ids, program_ids) for a domain, empty if registry missing"""
    inst_path = domain_dir / "institutes.json"
    prog_path = domain_dir / "programs.json"
    inst_ids = {i["id"] for i in json.loads(inst_path.read_text())} if inst_path.exists() else set()
    prog_ids = {p["id"] for p in json.loads(prog_path.read_text())} if prog_path.exists() else set()
    return inst_ids, prog_ids


def check_registry_validity(df: pl.DataFrame, inst_ids: set[str], prog_ids: set[str], rep: Report, fname: str) -> None:
    if inst_ids and "institute_id" in df.columns:
        bad = df.filter(~pl.col("institute_id").is_in(list(inst_ids)))
        if len(bad) > 0:
            rep.add(f"{fname}: {len(bad)} rows with unknown institute_id")
    if prog_ids and "program_id" in df.columns:
        bad = df.filter(~pl.col("program_id").is_in(list(prog_ids)))
        if len(bad) > 0:
            rep.add(f"{fname}: {len(bad)} rows with unknown program_id")


def check_instype_collisions(df: pl.DataFrame, rules: dict[str, set[str]], rep: Report, fname: str) -> None:
    """slug-prefix → instype consistency — e.g. iit-* must have instype IIT"""
    if "instype" not in df.columns:
        return
    for prefix, allowed in rules.items():
        # iit- prefix overlaps iiit- so guard explicitly
        cond = pl.col("institute_id").str.starts_with(prefix)
        if prefix == "iit-":
            cond = cond & ~pl.col("institute_id").str.starts_with("iiit-")
        bad = df.filter(cond & ~pl.col("instype").is_in(list(allowed)))
        if len(bad) > 0:
            sample = bad.select(["institute_id", "instype"]).unique().to_dicts()[:3]
            rep.add(f"{fname}: {prefix}* slug under wrong instype (allowed={allowed}): {sample}")


def check_exam_id(df: pl.DataFrame, rep: Report, fname: str) -> None:
    # exam_id replaced rank_exam — verify it is present and non-empty on cutoff rows
    if "exam_id" not in df.columns:
        return
    bad = df.filter(pl.col("exam_id").is_null() | (pl.col("exam_id") == ""))
    if len(bad) > 0:
        rep.add(f"{fname}: {len(bad)} rows with missing exam_id")


def check_duplicates(df: pl.DataFrame, rep: Report, fname: str) -> None:
    # generic key cols — quota_id/category_id/gender_id replaced old enum columns
    key_cols = ["year", "round", "institute_id", "program_id", "quota_id", "category_id", "gender_id"]
    available = [c for c in key_cols if c in df.columns]
    if len(available) < 5:
        return
    dupes = df.group_by(available).len().filter(pl.col("len") > 1)
    if len(dupes) > 0:
        rep.add(f"{fname}: {len(dupes)} duplicate row groups")


def check_value_sanity(df: pl.DataFrame, rep: Report, fname: str) -> None:
    # opening_value/closing_value are generic; only enforce ordering on rank score_type
    if "opening_value" not in df.columns or "closing_value" not in df.columns:
        return
    base = df.filter((pl.col("opening_value") < 0) | (pl.col("closing_value") < 0))
    if len(base) > 0:
        rep.add(f"{fname}: {len(base)} rows with negative values")
    if "score_type" in df.columns:
        rank_rows = df.filter(pl.col("score_type") == "rank")
        bad_rank = rank_rows.filter(pl.col("opening_value") > pl.col("closing_value"))
        if len(bad_rank) > 0:
            rep.add(f"{fname}: {len(bad_rank)} rank rows where opening_value > closing_value")


def cast_string_cols(df: pl.DataFrame) -> pl.DataFrame:
    """polars Categorical columns need String cast before string ops"""
    target = ("institute_id", "exam_id", "score_type", "quota_id", "category_id", "gender_id")
    casts = [pl.col(col).cast(pl.String) for col in target if col in df.columns]
    return df.with_columns(casts) if casts else df


def validate_file(
    f: Path,
    inst_ids: set[str],
    prog_ids: set[str],
    rules: dict[str, set[str]],
    slug_instype_map: dict[str, set[str]],
    rep: Report,
) -> None:
    print(f"\n{f.relative_to(ROOT)}")
    df = cast_string_cols(pl.read_parquet(f))
    check_registry_validity(df, inst_ids, prog_ids, rep, f.name)
    check_instype_collisions(df, rules, rep, f.name)
    check_exam_id(df, rep, f.name)
    check_duplicates(df, rep, f.name)
    check_value_sanity(df, rep, f.name)
    if "instype" in df.columns and "institute_id" in df.columns:
        for row in df.select(["institute_id", "instype"]).unique().to_dicts():
            slug_instype_map[row["institute_id"]].add(row["instype"])


def discover_domains() -> list[str]:
    if not REGISTRY_ROOT.exists():
        return []
    return sorted(d.name for d in REGISTRY_ROOT.iterdir() if d.is_dir())


def main() -> int:
    rep = Report()
    domains = discover_domains()
    if not domains:
        print("no registry domains found under data/registry/")
        return 0

    slug_instype_map: dict[str, set[str]] = defaultdict(set)

    for domain in domains:
        print(f"\n{'=' * 60}\ndomain: {domain}\n{'=' * 60}")
        inst_ids, prog_ids = load_registry_ids(REGISTRY_ROOT / domain)
        rules = INSTYPE_PREFIX_RULES.get(domain, {})
        data_dir = ROOT / "data" / domain
        files = sorted(data_dir.rglob("*.parquet")) if data_dir.exists() else []
        if not files:
            print(f"  no parquet files in data/{domain}/")
            continue
        for f in files:
            validate_file(f, inst_ids, prog_ids, rules, slug_instype_map, rep)

    inconsistent = {s: t for s, t in slug_instype_map.items() if len(t) > 1 and s not in DUAL_CLASS_OK}
    if inconsistent:
        rep.add(f"cross-year instype inconsistency: {inconsistent}")

    print("\n" + "=" * 60)
    if rep.issues:
        print(f"FAIL — {len(rep.issues)} issue(s)")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
