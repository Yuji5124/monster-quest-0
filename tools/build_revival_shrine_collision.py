# -*- coding: utf-8 -*-
"""Build assets/maps/revival_shrine/collision.png for the CURRENT No.15 ふっかつのほこら background.

background.png (1672x941) is byte-identical to assets/maps/reference/reference/新しいフォルダー/ふっかつのほこら_イメージ.png
(the top-down pixel map; the similarly named ふっかつのほこら.png is the painted illustration used as the entry splash) and
is never modified. The shrine is a few straight stone causeways, courts and one bridge over water, and its mossy flagstones
fail a colour test in patches, so unlike the village tools the walkable area is drawn by hand: the rectangles below are
walkable, OBSTACLES are cut back out, and only the area connected to the south entrance stairs is kept.

    python tools/build_revival_shrine_collision.py                    # rewrite collision.png
    python tools/build_revival_shrine_collision.py --preview out.png  # + the background with blocked areas tinted red

white = walkable / black = blocked. Coordinates are native background pixels (the Scene multiplies them by
worldScale). 941 is not a multiple of 8, so the cell grid is computed on 944 rows and cropped back to 941.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = REPO_ROOT / "assets" / "maps" / "revival_shrine"

WIDTH, HEIGHT = 1672, 941
CELL = 8
COLS, ROWS = WIDTH // CELL, -(-HEIGHT // CELL)

# Cell the connected area is grown from (= the fromWorldMap spawn on the south entrance stairs).
SEED = (836, 860)

# Walkable areas (x0, y0, x1, y1), x1 / y1 exclusive, multiples of CELL.
WALKABLE = [
    # south entrance stairs (they run off the bottom edge: the world-map exit sits here) and the gate passage above them
    ("entrance stairs", (784, 832, 888, 944)),
    ("gate passage", (784, 736, 888, 832)),
    # the lower court at the head of the gate passage
    ("lower court", (688, 672, 992, 744)),
    # stairs up from the lower court to the middle court
    ("lower stairs", (784, 552, 888, 680)),
    # the octagonal middle court with the diamond floor mark
    ("middle court", (712, 400, 960, 576)),
    # the opening in the court's west wall, the stone bridge over the water, its landing and the west island with the sigil
    ("west court gate", (664, 448, 720, 504)),
    ("west bridge", (528, 448, 672, 504)),
    ("west landing", (424, 440, 536, 512)),
    ("west island", (200, 424, 432, 536)),
    # stairs up from the middle court to the upper terrace
    ("upper stairs", (784, 232, 888, 400)),
    # the upper terrace in front of the altar, and the round altar steps up to the glowing dais
    ("upper terrace", (552, 184, 1128, 248)),
    ("altar steps", (728, 88, 944, 184)),
]

# Blocked areas (x0, y0, x1, y1) inside the walkable rectangles.
OBSTACLES = [
    # the two tall pillars standing on the upper terrace either side of the altar
    (656, 128, 712, 240),
    (960, 128, 1016, 240),
]


def paint(cells, rect, value):
    for v in rect:
        assert v % CELL == 0, f"{rect} is not aligned to the {CELL}px cell grid"
    x0, y0, x1, y1 = rect
    cells[y0 // CELL:y1 // CELL, x0 // CELL:x1 // CELL] = value


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


def build(preview=None):
    background = Image.open(MAP_DIR / "background.png")
    assert background.size == (WIDTH, HEIGHT), f"background.png is {background.size}, expected {(WIDTH, HEIGHT)}"
    cells = np.zeros((ROWS, COLS), dtype=bool)
    for _, rect in WALKABLE:
        paint(cells, rect, True)
    for rect in OBSTACLES:
        paint(cells, rect, False)
    cells = connected_from(cells, (SEED[1] // CELL, SEED[0] // CELL))

    full = Image.fromarray((cells * 255).astype("uint8")).resize((COLS * CELL, ROWS * CELL), Image.NEAREST)
    mask = full.crop((0, 0, WIDTH, HEIGHT)).convert("RGB")
    mask.save(MAP_DIR / "collision.png", optimize=True)
    print(f"wrote {MAP_DIR / 'collision.png'} ({WIDTH}x{HEIGHT}, walkable cells={int(cells.sum())})")

    if preview:
        red = Image.new("RGB", background.size, (255, 0, 0))
        tint = mask.convert("L").point(lambda v: 120 if v < 128 else 0)
        Image.composite(red, background.convert("RGB"), tint).save(preview)
        print(f"wrote preview {preview}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="also write the background with blocked areas tinted red to this path")
    build(parser.parse_args().preview)
