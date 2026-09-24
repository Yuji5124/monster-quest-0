# -*- coding: utf-8 -*-
"""Build assets/maps/bie_village/collision.png for the CURRENT No.04 ビーエのむら background.

background.png (1536x1024) is byte-identical to assets/maps/reference/reference/ビーエのむら更新.png and is never
modified. The walkable area is the drawn sand road network: each 8px runtime cell (map.json collisionCellSize) whose
pixels are mostly sand-coloured becomes walkable, the result is cleaned (small holes in cobblestones filled, isolated
specks dropped, only the road network connected to the north gate kept), and then the hand-measured rectangles below
add the parts that are not sand-coloured (gate stairs, bridges, stone stairs) or remove what must stay blocked.

    python tools/build_bie_village_collision.py                    # rewrite collision.png
    python tools/build_bie_village_collision.py --preview out.png  # + the background with blocked areas tinted red

white = walkable / black = blocked. Coordinates are native background pixels (the Scene multiplies them by
worldScale). When the background is replaced again: rerun this script, check --preview, adjust the rectangles, then
re-place the spawn / event coordinates (src/config/maps.ts, events.json). The Scene code does not depend on any of it.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = REPO_ROOT / "assets" / "maps" / "bie_village"

WIDTH, HEIGHT = 1536, 1024
CELL = 8
COLS, ROWS = WIDTH // CELL, HEIGHT // CELL

# A cell is road when at least this share of its pixels is sand-coloured.
SAND_CELL_RATIO = 0.5
# Cell the connected road network is grown from (just inside the north gate, = the fromWorldMap spawn).
SEED = (710, 150)

# Walkable additions (x0, y0, x1, y1), x1 / y1 exclusive, multiples of CELL.
WALKABLE = [
    # north gate: the road under the wooden arch and the stone stairs down into the village (exit zone sits here)
    ("north gate road", (672, 0, 752, 64)),
    ("north gate stairs", (672, 64, 744, 128)),
    # stone stairs between the south-west road (by the bridge) and the plaza road
    ("south-west stairs", (512, 664, 616, 728)),
    # wooden bridge over the river (south-west)
    ("river bridge", (296, 792, 488, 840)),
    # landing in front of the watermill door (the footbridge beyond it only leads into the waterfall: left blocked)
    ("watermill landing", (288, 352, 360, 400)),
]

# Blocked areas (x0, y0, x1, y1) that the colour mask would otherwise let through.
OBSTACLES = [
    # the big tree's stone ring and benches in the middle of the plaza
    (744, 472, 960, 592),
    # well / stone oven beside the east blue house
    (1080, 416, 1144, 480),
    # the log pile and sawhorse in the woodcutter's yard
    (1104, 792, 1184, 856),
]


def sand_cells(background):
    rgb = np.asarray(background.convert("RGB")).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    sand = (r > 170) & (g > 140) & (b > 80) & (b < 190) & (r - b > 45) & (r >= g) & (g - b > 20)
    return sand.reshape(ROWS, CELL, COLS, CELL).mean(axis=(1, 3)) >= SAND_CELL_RATIO


def neighbours(cells):
    padded = np.pad(cells, 1)
    return sum(padded[1 + dy:ROWS + 1 + dy, 1 + dx:COLS + 1 + dx].astype(int)
               for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx, dy) != (0, 0))


def clean(cells):
    # fill single-cell holes left by darker cobblestones, then drop lonely specks
    cells = cells | (neighbours(cells) >= 6)
    cells = cells & (neighbours(cells) >= 3)
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


def build(preview=None):
    background = Image.open(MAP_DIR / "background.png")
    assert background.size == (WIDTH, HEIGHT), f"background.png is {background.size}, expected {(WIDTH, HEIGHT)}"
    cells = clean(sand_cells(background))
    for _, rect in WALKABLE:
        paint(cells, rect, True)
    for rect in OBSTACLES:
        paint(cells, rect, False)
    cells = connected_from(cells, (SEED[1] // CELL, SEED[0] // CELL))

    mask = Image.fromarray((cells * 255).astype("uint8")).resize((WIDTH, HEIGHT), Image.NEAREST).convert("RGB")
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
