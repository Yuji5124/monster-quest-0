# -*- coding: utf-8 -*-
"""Build collision.png for the two floors of No.09 いわやまのどうくつ.

    iwayama_cave_1/background.png = assets/maps/reference/reference/いわやまのどうくつ_1.png (1F, byte-identical)
    iwayama_cave_2/background.png = assets/maps/reference/reference/いわやまのどうくつ_3.png (2F, byte-identical)

(いわやまのどうくつ_2.png is byte-identical to _1.png, so the user chose two floors: 2026-09-23.)
The backgrounds are never modified. Same method as tools/build_zabon_village_collision.py: each 8px runtime cell
(map.json collisionCellSize) whose pixels are mostly the warm-brown cobble floor becomes walkable, the result is cleaned
(holes filled, isolated specks dropped), grown onto the neighbouring partly-floor cells (the path edges are lined with
small dark stones), the hand-measured rectangles below add what is not floor-coloured (wooden
stairs, rope bridges) or remove what must stay blocked, and only the network connected to the floor's entrance is kept.
Rock spires, cliff faces, the underground lake and the darkness stay blocked.

    python tools/build_iwayama_cave_collision.py                       # rewrite both collision.png files
    python tools/build_iwayama_cave_collision.py --preview out_dir     # + backgrounds with blocked areas tinted red

white = walkable / black = blocked. Coordinates are native background pixels (the Scene multiplies them by worldScale).
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MAPS_DIR = REPO_ROOT / "assets" / "maps"

WIDTH, HEIGHT = 1024, 1536
CELL = 8
COLS, ROWS = WIDTH // CELL, HEIGHT // CELL
FLOOR_CELL_RATIO = 0.35
WIDEN_CELL_RATIO = 0.12
WIDEN_PASSES = 2

# (x0, y0, x1, y1), x1 / y1 exclusive, multiples of CELL.
FLOORS = {
    "iwayama_cave_1": {
        # the fromWorldMap spawn, on the south-west stairs that come up out of the darkness
        "seed": (256, 1168),
        "walkable": [
            ("south-west entrance stairs", (232, 1088, 280, 1248)),
            ("west stairs (lower)", (152, 784, 208, 904)),
            ("west stairs (upper)", (136, 480, 184, 664)),
            ("north-east stairs", (880, 216, 928, 424)),
            ("east stairs", (784, 832, 832, 992)),
            ("north bridge", (512, 440, 680, 480)),
            ("lake bridge", (320, 720, 560, 760)),
            ("south bridge", (584, 1056, 768, 1096)),
        ],
        "obstacles": [],
    },
    "iwayama_cave_2": {
        # the fromCaveFloor1 spawn, on the south stairs above the blue arrival marker
        "seed": (512, 1168),
        "walkable": [
            ("south stairs", (488, 1072, 536, 1248)),
            ("centre stairs", (488, 744, 536, 896)),
            ("north stairs", (488, 248, 536, 424)),
            ("north landing", (488, 192, 544, 256)),
            ("west stairs", (120, 504, 168, 664)),
            ("east stairs", (864, 504, 912, 664)),
            ("west bridge", (200, 688, 360, 728)),
            ("east bridge", (672, 680, 824, 720)),
        ],
        "obstacles": [],
    },
}


def floor_ratio(background):
    rgb = np.asarray(background.convert("RGB")).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    floor = (r > 85) & (g > 65) & (r - b > 25) & (r - b < 120)
    return floor.reshape(ROWS, CELL, COLS, CELL).mean(axis=(1, 3))


def neighbours(cells):
    padded = np.pad(cells, 1)
    return sum(padded[1 + dy:ROWS + 1 + dy, 1 + dx:COLS + 1 + dx].astype(int)
               for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx, dy) != (0, 0))


def clean(cells):
    cells = cells | (neighbours(cells) >= 6)
    cells = cells & (neighbours(cells) >= 3)
    return cells


def widen(cells, ratio):
    # the cobble floor is edged with small dark stones, so its colour mask comes out narrower than the drawn path and
    # breaks up where the path narrows: grow onto neighbouring cells that are still partly floor (never onto the dark
    # rock spires or the darkness, whose floor ratio is ~0)
    for _ in range(WIDEN_PASSES):
        cells = cells | ((neighbours(cells) >= 3) & (ratio >= WIDEN_CELL_RATIO))
    return cells


def connected_from(cells, seed_cell):
    keep = np.zeros_like(cells)
    stack = [seed_cell]
    while stack:
        row, col = stack.pop()
        if not (0 <= row < ROWS and 0 <= col < COLS) or keep[row, col] or not cells[row, col]:
            continue
        keep[row, col] = True
        stack.extend(((row + 1, col), (row - 1, col), (row, col + 1), (row, col - 1)))
    return keep


def paint(cells, rect, value):
    for v in rect:
        assert v % CELL == 0, f"{rect} is not aligned to the {CELL}px cell grid"
    x0, y0, x1, y1 = rect
    cells[y0 // CELL:y1 // CELL, x0 // CELL:x1 // CELL] = value


def build(name, config, preview_dir=None):
    map_dir = MAPS_DIR / name
    background = Image.open(map_dir / "background.png")
    assert background.size == (WIDTH, HEIGHT), f"{name}/background.png is {background.size}, expected {(WIDTH, HEIGHT)}"
    ratio = floor_ratio(background)
    cells = widen(clean(ratio >= FLOOR_CELL_RATIO), ratio)
    for _, rect in config["walkable"]:
        paint(cells, rect, True)
    for rect in config["obstacles"]:
        paint(cells, rect, False)
    seed = config["seed"]
    cells = connected_from(cells, (seed[1] // CELL, seed[0] // CELL))

    mask = Image.fromarray((cells * 255).astype("uint8")).resize((WIDTH, HEIGHT), Image.NEAREST).convert("RGB")
    mask.save(map_dir / "collision.png", optimize=True)
    print(f"wrote {map_dir / 'collision.png'} ({WIDTH}x{HEIGHT}, walkable cells={int(cells.sum())})")

    if preview_dir:
        red = Image.new("RGB", background.size, (255, 0, 0))
        tint = mask.convert("L").point(lambda v: 120 if v < 128 else 0)
        out = Path(preview_dir) / f"{name}_collision_preview.png"
        Image.composite(red, background.convert("RGB"), tint).save(out)
        print(f"wrote preview {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="also write each background with blocked areas tinted red into this directory")
    args = parser.parse_args()
    for floor_name, floor_config in FLOORS.items():
        build(floor_name, floor_config, args.preview)
