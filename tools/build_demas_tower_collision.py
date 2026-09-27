# -*- coding: utf-8 -*-
"""Build the editable Collision Masks for No.16 デーマスのとう.

Each CURRENT background is an unmodified copy of the user-provided 1448x1086
source image.  The tower is deliberately compact in play: the masks retain the
main stair-and-gallery route between floors, while decorative side chambers
remain background-only until a future event or treasure requires them.

    python tools/build_demas_tower_collision.py
    python tools/build_demas_tower_collision.py --preview out_dir

White is walkable and black is blocked.  Rectangles are native background
pixels and aligned to the 8px Collision grid used at runtime.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parent.parent
MAPS_DIR = REPO_ROOT / "assets" / "maps"
WIDTH, HEIGHT, CELL = 1448, 1086, 8
COLS, ROWS = WIDTH // CELL, -(-HEIGHT // CELL)

# These are the visible central stairs, bridges and galleries.  Side rooms are
# intentionally not opened yet: there are no placed objects/events in them.
WALKABLE = {
    "demas_tower_1": [
        ("south entrance stairs", (648, 936, 808, 1088)),
        ("lower nave", (568, 704, 888, 944)),
        ("ritual hall", (552, 480, 896, 712)),
        ("upper bridge", (616, 312, 832, 488)),
        ("north stair", (648, 120, 800, 320)),
        ("north landing", (584, 0, 864, 128)),
    ],
    "demas_tower_2": [
        ("south entrance stairs", (648, 936, 808, 1088)),
        ("lower gallery", (568, 704, 888, 944)),
        ("central bridge", (616, 488, 832, 712)),
        ("eye chamber", (552, 352, 896, 496)),
        ("north stair", (648, 120, 800, 360)),
        ("north landing", (584, 0, 864, 128)),
    ],
    "demas_tower_3": [
        ("south entrance stairs", (648, 936, 808, 1088)),
        ("lower gallery", (584, 704, 872, 944)),
        ("red carpet approach", (648, 440, 800, 712)),
        ("central boss dais", (536, 264, 912, 520)),
    ],
}


def paint(cells: np.ndarray, rect: tuple[int, int, int, int]) -> None:
    for value in rect:
        assert value % CELL == 0, f"{rect} is not aligned to {CELL}px"
    x0, y0, x1, y1 = rect
    cells[y0 // CELL:min(y1 // CELL, ROWS), x0 // CELL:min(x1 // CELL, COLS)] = True


def build(name: str, preview_dir: Path | None) -> None:
    map_dir = MAPS_DIR / name
    background = Image.open(map_dir / "background.png")
    assert background.size == (WIDTH, HEIGHT), f"{name} background size is {background.size}"
    cells = np.zeros((ROWS, COLS), dtype=bool)
    for _, rect in WALKABLE[name]:
        paint(cells, rect)
    full = Image.fromarray((cells * 255).astype("uint8")).resize((COLS * CELL, ROWS * CELL), Image.Resampling.NEAREST)
    mask = full.crop((0, 0, WIDTH, HEIGHT)).convert("RGB")
    mask.save(map_dir / "collision.png", optimize=True)
    print(f"wrote {map_dir / 'collision.png'} ({WIDTH}x{HEIGHT}, walkable cells={int(cells.sum())})")
    if preview_dir is not None:
        preview_dir.mkdir(parents=True, exist_ok=True)
        blocked = Image.new("RGB", background.size, (190, 18, 38))
        tint = mask.convert("L").point(lambda value: 145 if value < 128 else 0)
        Image.composite(blocked, background.convert("RGB"), tint).save(preview_dir / f"{name}_collision_preview.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", type=Path, help="directory for red-tinted blocked-area previews")
    arguments = parser.parse_args()
    for floor in WALKABLE:
        build(floor, arguments.preview)
