#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "assets" / "_inbox"
MAP_FILE = ROOT / "tools" / "asset_rename_map.json"


def main() -> None:
    if not MAP_FILE.exists():
        raise SystemExit(f"rename map not found: {MAP_FILE}")

    mapping = json.loads(MAP_FILE.read_text(encoding="utf-8"))
    moved = []
    missing = []

    for old_name, rel_dest in mapping.items():
        src = INBOX / old_name
        dest = ROOT / rel_dest
        if not src.exists():
            missing.append(old_name)
            continue

        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            print(f"SKIP existing: {dest.relative_to(ROOT)}")
            continue

        shutil.move(str(src), str(dest))
        moved.append((old_name, str(dest.relative_to(ROOT))))
        print(f"MOVE {old_name} -> {dest.relative_to(ROOT)}")

    leftovers = sorted(
        p.name for p in INBOX.iterdir()
        if p.is_file() and p.name != ".gitkeep"
    )

    print("\n=== summary ===")
    print(f"moved: {len(moved)}")
    print(f"mapped but missing: {len(missing)}")
    print(f"unmapped inbox files: {len(leftovers)}")
    if leftovers:
        print("\nUnmapped files:")
        for name in leftovers:
            print(f"- {name}")


if __name__ == "__main__":
    main()
