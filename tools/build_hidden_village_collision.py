# -*- coding: utf-8 -*-
"""Build the human-adjustable collision mask for No.10 かくれざと.

The user-supplied background stays byte-identical. Tan stone and dirt routes are sampled per
8px runtime cell, then the hand-measured bridges, stairs, gate and house-front landings below
are added. The walkable network is restricted to the component reached from the north-west gate.

    python tools/build_hidden_village_collision.py
    python tools/build_hidden_village_collision.py --preview out.png

white = walkable / black = blocked. All coordinates are native background pixels.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = REPO_ROOT / "assets" / "maps" / "hidden_village"
WIDTH, HEIGHT, CELL = 1536, 1024, 8
COLS, ROWS = WIDTH // CELL, HEIGHT // CELL
SEED = (160, 72)

# Stone-paved paths and pale dirt have a warm yellow cast. Bridges and stair treads need
# explicit additions because their brown/grey planks fall outside that colour range.
WALKABLE = [
    ("north-west gate", (112, 0, 208, 104)),
    ("north-west gate bend", (160, 80, 264, 184)),
    ("west upper stair", (248, 160, 336, 264)),
    ("west street", (184, 312, 520, 432)),
    ("west flower path", (88, 400, 264, 488)),
    ("central square", (480, 328, 912, 512)),
    ("shrine stair", (656, 128, 768, 232)),
    ("shrine route", (656, 144, 776, 352)),
    ("east house approach", (872, 304, 1040, 392)),
    ("east house terrace", (1000, 272, 1168, 392)),
    ("upper east bridge", (1192, 144, 1440, 208)),
    ("middle east bridge", (976, 424, 1216, 488)),
    ("east flower terrace", (1224, 448, 1464, 576)),
    # The small middle bridge joins the square to the flower terrace.  Its railings make
    # the sampled colours unreliable, so keep a body-width overlap at both ends.
    ("east flower bridge join", (1176, 416, 1280, 504)),
    ("central south stair", (712, 488, 824, 608)),
    ("lower bridge", (760, 592, 1032, 680)),
    ("watermill approach", (976, 648, 1112, 760)),
    ("lower west approach", (448, 472, 552, 720)),
    ("lower west street", (264, 600, 544, 800)),
    ("lower west house landing", (232, 720, 456, 824)),
    ("watermill landing", (1024, 704, 1224, 824)),
    # The watermill's front path continues below the wheel; this keeps the house-front
    # resident and the south bridge on one walkable route after the building is masked.
    ("watermill doorstep", (992, 760, 1240, 848)),
    ("cave approach", (1200, 800, 1400, 1000)),
]

# Obstacles that can share warm colours with paths must remain solid.
OBSTACLES = [
    (448, 216, 704, 368),   # central thatched house
    (112, 272, 288, 408),   # west tiled house
    (1000, 208, 1176, 352), # east blue-roof house
    (248, 624, 496, 760),  # lower west house
    (1040, 624, 1240, 760),# watermill building and wheel
    (680, 56, 816, 152),    # hill shrine
]


def neighbours(cells):
    padded = np.pad(cells, 1)
    return sum(
        padded[1 + dy:ROWS + 1 + dy, 1 + dx:COLS + 1 + dx].astype(int)
        for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx, dy) != (0, 0)
    )


def paint(cells, rect, value):
    assert all(value % CELL == 0 for value in rect), f"{rect} is not aligned to {CELL}px"
    x0, y0, x1, y1 = rect
    cells[y0 // CELL:y1 // CELL, x0 // CELL:x1 // CELL] = value


def connected_from(cells):
    keep = np.zeros_like(cells)
    stack = [(SEED[1] // CELL, SEED[0] // CELL)]
    while stack:
        row, col = stack.pop()
        if not (0 <= row < ROWS and 0 <= col < COLS) or keep[row, col] or not cells[row, col]:
            continue
        keep[row, col] = True
        stack.extend(((row + 1, col), (row - 1, col), (row, col + 1), (row, col - 1)))
    return keep


def build(preview=None):
    background = Image.open(MAP_DIR / "background.png").convert("RGB")
    assert background.size == (WIDTH, HEIGHT), f"background.png is {background.size}, expected {(WIDTH, HEIGHT)}"
    rgb = np.asarray(background).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    sand = (r > 155) & (g > 125) & (b > 55) & (b < 185) & (r - b > 42) & (g - b > 18) & (r >= g)
    cells = sand.reshape(ROWS, CELL, COLS, CELL).mean(axis=(1, 3)) >= 0.42
    counts = neighbours(cells)
    cells = (cells | (counts >= 6)) & (counts >= 3)
    for _, rect in WALKABLE:
        paint(cells, rect, True)
    for rect in OBSTACLES:
        paint(cells, rect, False)
    cells = connected_from(cells)
    mask = Image.fromarray((cells * 255).astype("uint8")).resize((WIDTH, HEIGHT), Image.Resampling.NEAREST).convert("RGB")
    mask.save(MAP_DIR / "collision.png", optimize=True)
    print(f"wrote {MAP_DIR / 'collision.png'} ({WIDTH}x{HEIGHT}, walkable cells={int(cells.sum())})")
    if preview:
        tint = mask.convert("L").point(lambda value: 125 if value < 128 else 0)
        Image.composite(Image.new("RGB", background.size, (255, 0, 0)), background, tint).save(preview)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="also write a red-tinted blocked-area preview")
    build(parser.parse_args().preview)
