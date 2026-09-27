# -*- coding: utf-8 -*-
"""Build the hand-authored Collision Mask for No.14 ポサロ城.

The CURRENT background is the user-provided top-down boss hall. This map intentionally
implements only the accessible south stair, central hall, throne stairs, and upper dais:
the surrounding lava, walls, columns, statues, and side rooms stay blocked. Coordinates
are native background pixels. The shared image-map runtime applies map.json.worldScale.

    python tools/build_posaro_castle_collision.py
    python tools/build_posaro_castle_collision.py --preview out.png
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = REPO_ROOT / "assets" / "maps" / "posaro_castle"

WIDTH, HEIGHT = 1448, 1086
CELL = 8
COLS, ROWS = WIDTH // CELL, -(-HEIGHT // CELL)

# The south entrance joins the empty centre of the boss hall. Rectangles remain deliberately
# inset from the column bases and lava, rather than relying on image colour recognition.
WALKABLE = [
    ("south entrance stairs", (648, 888, 800, 1088)),
    ("central hall", (400, 400, 1048, 896)),
    ("throne stairs", (608, 208, 840, 424)),
    ("upper dais approach", (520, 136, 928, 216)),
]


def paint(cells, rect, value):
    for coordinate in rect:
        assert coordinate % CELL == 0, f"{rect} is not aligned to the {CELL}px grid"
    x0, y0, x1, y1 = rect
    cells[y0 // CELL:y1 // CELL, x0 // CELL:x1 // CELL] = value


def connected_from(cells, seed):
    connected = np.zeros_like(cells)
    stack = [seed]
    while stack:
        row, column = stack.pop()
        if not (0 <= row < ROWS and 0 <= column < COLS) or connected[row, column] or not cells[row, column]:
            continue
        connected[row, column] = True
        stack.extend(((row + 1, column), (row - 1, column), (row, column + 1), (row, column - 1)))
    return connected


def build(preview=None):
    background = Image.open(MAP_DIR / "background.png")
    assert background.size == (WIDTH, HEIGHT), f"background.png is {background.size}, expected {(WIDTH, HEIGHT)}"

    cells = np.zeros((ROWS, COLS), dtype=bool)
    for _, rect in WALKABLE:
        paint(cells, rect, True)
    cells = connected_from(cells, (1016 // CELL, 724 // CELL))

    full = Image.fromarray((cells * 255).astype("uint8")).resize((COLS * CELL, ROWS * CELL), Image.NEAREST)
    mask = full.crop((0, 0, WIDTH, HEIGHT)).convert("RGB")
    mask.save(MAP_DIR / "collision.png", optimize=True)
    print(f"wrote {MAP_DIR / 'collision.png'} ({WIDTH}x{HEIGHT}, walkable cells={int(cells.sum())})")

    if preview:
        blocked = Image.new("RGB", background.size, (190, 30, 35))
        tint = mask.convert("L").point(lambda value: 115 if value < 128 else 0)
        Image.composite(blocked, background.convert("RGB"), tint).save(preview)
        print(f"wrote preview {preview}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="also write a background preview with blocked regions tinted red")
    build(parser.parse_args().preview)
