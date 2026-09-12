#!/usr/bin/env python3
"""Audit and safely stage image assets before importing them into Monster Quest 0.

The script never deletes or overwrites source files.

Typical usage:
    python tools/asset_intake.py ~/Downloads/mq0-images
    python tools/asset_intake.py ~/Downloads/mq0-images --repo-root . --apply

Without --apply it only writes a CSV manifest and prints a summary.
With --apply it copies one canonical file per SHA-256 into the repository path
suggested by the manifest. Existing files are never overwritten when content
is different.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path, PurePosixPath

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
SAFE_STEM_RE = re.compile(r"^[a-z0-9]+(?:_[a-z0-9]+)*$")
UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
IMG_RE = re.compile(r"^img[_-]?\d+$", re.IGNORECASE)
NUMBER_RE = re.compile(r"^\d+$")
COPY_SUFFIX_RE = re.compile(r"\(\d+\)$")
CHATGPT_RE = re.compile(r"^chatgpt[ _-]+image", re.IGNORECASE)
HEXISH_RE = re.compile(r"^[0-9a-f-]{20,}$", re.IGNORECASE)


@dataclass
class AssetRecord:
    source: Path
    relative_source: str
    filename: str
    size: int
    sha256: str
    proposed_target: str
    status: str
    note: str = ""
    duplicate_of: str = ""


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def is_generic_stem(stem: str) -> bool:
    normalized = stem.strip()
    return bool(
        UUID_RE.fullmatch(normalized)
        or IMG_RE.fullmatch(normalized)
        or NUMBER_RE.fullmatch(normalized)
        or CHATGPT_RE.match(normalized)
        or HEXISH_RE.fullmatch(normalized)
        or len(normalized) <= 1
        or COPY_SUFFIX_RE.search(normalized)
    )


def is_safe_semantic_name(path: Path) -> bool:
    stem = path.stem
    return bool(SAFE_STEM_RE.fullmatch(stem)) and not is_generic_stem(stem)


def validate_repo_target(target: str) -> str:
    p = PurePosixPath(target)
    if p.is_absolute() or ".." in p.parts:
        raise ValueError(f"unsafe target path: {target}")
    if not p.parts or p.parts[0] != "assets":
        raise ValueError(f"target must be under assets/: {target}")
    if p.suffix.lower() not in IMAGE_EXTENSIONS:
        raise ValueError(f"target is not a supported image path: {target}")
    return p.as_posix()


def load_overrides(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("rename overrides must be a JSON object")
    clean: dict[str, str] = {}
    for source_name, target in data.items():
        if not isinstance(source_name, str) or not isinstance(target, str):
            raise ValueError("rename override keys and values must be strings")
        clean[source_name] = validate_repo_target(target)
    return clean


def fallback_target(path: Path, digest: str) -> str:
    stamp = datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y%m%d")
    ext = path.suffix.lower()
    return f"assets/_inbox/raw/ref_{stamp}_{digest[:8]}{ext}"


def normalized_target(path: Path) -> str:
    return f"assets/_inbox/normalized/{path.name.lower()}"


def proposal_rank(record: AssetRecord) -> tuple[int, str]:
    # Prefer an explicitly mapped file as the canonical duplicate representative.
    rank = {
        "mapped": 0,
        "normalized": 1,
        "needs_review": 2,
    }.get(record.status, 9)
    return rank, record.relative_source.lower()


def scan_assets(input_dir: Path, overrides: dict[str, str]) -> list[AssetRecord]:
    records: list[AssetRecord] = []
    image_paths = sorted(
        p
        for p in input_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )

    for path in image_paths:
        digest = sha256_file(path)
        relative = path.relative_to(input_dir).as_posix()

        if path.name in overrides:
            target = overrides[path.name]
            status = "mapped"
            note = "exact filename override"
        elif is_safe_semantic_name(path):
            target = normalized_target(path)
            status = "normalized"
            note = "GitHub-safe name, category still needs review"
        else:
            target = fallback_target(path, digest)
            status = "needs_review"
            note = "generic, generated, Japanese, spaced, or otherwise non-canonical source name"

        records.append(
            AssetRecord(
                source=path,
                relative_source=relative,
                filename=path.name,
                size=path.stat().st_size,
                sha256=digest,
                proposed_target=target,
                status=status,
                note=note,
            )
        )

    # Mark byte-identical duplicates. Keep the strongest candidate as canonical.
    groups: dict[str, list[AssetRecord]] = defaultdict(list)
    for record in records:
        groups[record.sha256].append(record)

    for group in groups.values():
        if len(group) < 2:
            continue
        canonical = sorted(group, key=proposal_rank)[0]
        for record in group:
            if record is canonical:
                record.note = (record.note + "; canonical copy among byte-identical duplicates").strip("; ")
                continue
            record.status = "duplicate"
            record.duplicate_of = canonical.relative_source
            record.proposed_target = canonical.proposed_target
            record.note = "byte-identical duplicate; do not import"

    # Detect different files that would map to the same target.
    by_target: dict[str, list[AssetRecord]] = defaultdict(list)
    for record in records:
        if record.status != "duplicate":
            by_target[record.proposed_target].append(record)

    for target, group in by_target.items():
        hashes = {r.sha256 for r in group}
        if len(group) > 1 and len(hashes) > 1:
            for record in group:
                record.status = "target_conflict"
                record.note = f"different content proposed for the same target: {target}"

    return records


def write_manifest(records: list[AssetRecord], manifest_path: Path) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with manifest_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "source",
                "filename",
                "size_bytes",
                "sha256",
                "status",
                "target",
                "duplicate_of",
                "note",
            ],
        )
        writer.writeheader()
        for r in records:
            writer.writerow(
                {
                    "source": r.relative_source,
                    "filename": r.filename,
                    "size_bytes": r.size,
                    "sha256": r.sha256,
                    "status": r.status,
                    "target": r.proposed_target,
                    "duplicate_of": r.duplicate_of,
                    "note": r.note,
                }
            )


def existing_hash(path: Path) -> str | None:
    if not path.exists() or not path.is_file():
        return None
    return sha256_file(path)


def apply_records(records: list[AssetRecord], repo_root: Path) -> tuple[int, int, int]:
    copied = skipped = conflicts = 0
    for r in records:
        if r.status in {"duplicate", "target_conflict"}:
            if r.status == "target_conflict":
                conflicts += 1
            continue

        dest = repo_root / PurePosixPath(r.proposed_target)
        dest.parent.mkdir(parents=True, exist_ok=True)

        current_hash = existing_hash(dest)
        if current_hash is not None:
            if current_hash == r.sha256:
                skipped += 1
                continue
            print(
                f"CONFLICT: refusing to overwrite {dest} with different content from {r.relative_source}",
                file=sys.stderr,
            )
            conflicts += 1
            continue

        shutil.copy2(r.source, dest)
        copied += 1

    return copied, skipped, conflicts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit, deduplicate, and safely stage MQ0 image assets."
    )
    parser.add_argument("input_dir", type=Path, help="Folder containing exported Library images")
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path("."),
        help="monster-quest-0 repository root (default: current directory)",
    )
    parser.add_argument(
        "--overrides",
        type=Path,
        default=None,
        help="override JSON path (default: <repo-root>/assets/rename_overrides.json)",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("asset_intake_manifest.csv"),
        help="CSV audit output path",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="copy unique files into their proposed repository paths; never overwrites different content",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = args.input_dir.expanduser().resolve()
    repo_root = args.repo_root.expanduser().resolve()

    if not input_dir.is_dir():
        print(f"Input folder not found: {input_dir}", file=sys.stderr)
        return 2

    overrides_path = args.overrides or (repo_root / "assets" / "rename_overrides.json")
    try:
        overrides = load_overrides(overrides_path)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Failed to load overrides: {exc}", file=sys.stderr)
        return 2

    records = scan_assets(input_dir, overrides)
    write_manifest(records, args.manifest)

    counts = Counter(r.status for r in records)
    unique_hashes = len({r.sha256 for r in records})
    print(f"Images scanned: {len(records)}")
    print(f"Unique byte contents: {unique_hashes}")
    for key in ["mapped", "normalized", "needs_review", "duplicate", "target_conflict"]:
        if counts[key]:
            print(f"{key}: {counts[key]}")
    print(f"Manifest: {args.manifest.resolve()}")

    if args.apply:
        copied, skipped, conflicts = apply_records(records, repo_root)
        print(f"Copied: {copied}")
        print(f"Already present with same content: {skipped}")
        print(f"Conflicts not written: {conflicts}")
        if conflicts:
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
