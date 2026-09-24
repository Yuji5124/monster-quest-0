# -*- coding: utf-8 -*-
"""Build assets/maps/zabon_village/collision.png for the CURRENT No.08 ザボンのむら background.

background.png (1448x1086) is byte-identical to assets/maps/reference/reference/ザボンのむら　新.png and is never
modified. Same method as tools/build_bie_village_collision.py: each 8px runtime cell (map.json collisionCellSize) whose
pixels are mostly sand-coloured becomes walkable, the result is cleaned (holes in cobbles filled, isolated specks
dropped), the hand-measured rectangles below add what is not sand-coloured (bridge, pier, stairs) or remove what must
stay blocked, the network is widened by one cell onto its verge (not onto water / obstacles) so the player's feet box
fits the diagonal roads, and only the road network connected to the north-east entrance is kept.

    python tools/build_zabon_village_collision.py                    # rewrite collision.png
    python tools/build_zabon_village_collision.py --preview out.png  # + the background with blocked areas tinted red

white = walkable / black = blocked. Coordinates are native background pixels (the Scene multiplies them by
worldScale). 1086 is not a multiple of 8, so the cell grid is computed on 1088 rows and cropped back to 1086.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = REPO_ROOT / "assets" / "maps" / "zabon_village"

WIDTH, HEIGHT = 1448, 1086
CELL = 8
COLS, ROWS = WIDTH // CELL, -(-HEIGHT // CELL)

SAND_CELL_RATIO = 0.5
# Cell the connected road network is grown from (= the fromWorldMap spawn on the north-east road).
SEED = (1260, 120)

# Walkable additions (x0, y0, x1, y1), x1 / y1 exclusive, multiples of CELL.
WALKABLE = [
    # north-east road where it leaves the top edge (the world-map exit zone sits here)
    ("north-east road", (1088, 0, 1152, 64)),
    # its diagonal bend down to the cave fork: the drawn road is wider than the colour mask (grass tufts on it)
    ("north-east bend 1", (1096, 64, 1176, 96)),
    ("north-east bend 2", (1136, 88, 1232, 120)),
    ("north-east bend 3", (1176, 104, 1280, 136)),
    # the packed ground in front of the cave mouth at the north-east (the cave itself stays blocked; its event sits here)
    ("cave mouth apron", (1288, 88, 1344, 112)),
    # stone stairs west of the chief's hall, between the upper road and the hall's side yard
    ("hall side stairs", (552, 192, 608, 248)),
    # stone steps up to the chief's hall door (the door itself stays blocked: no interior yet)
    ("hall front steps", (664, 376, 728, 416)),
    # rope bridge over the river on the west side (the road runs on off the left edge)
    ("west bridge", (0, 488, 192, 536)),
    # the road from the bridge up to the plaza is ~50px wide in the artwork (its grass-tufted top edge fails the colour test)
    ("west road", (184, 480, 336, 528)),
    ("west road to plaza", (320, 440, 472, 480)),
    # wooden pier at the south-west shore: upper deck, the step down, lower deck
    ("pier upper deck", (256, 848, 336, 896)),
    ("pier middle", (192, 872, 280, 928)),
    ("pier lower deck", (104, 904, 240, 952)),
]

# Blocked areas (x0, y0, x1, y1) that the colour mask would otherwise let through.
OBSTACLES = [
    # the carved totem pole, its stone circle and the standing stones in the middle of the plaza
    (600, 456, 784, 592),
    # the well south-west of the plaza
    (432, 600, 496, 664),
]


def sand_cells(background):
    rgb = np.zeros((ROWS * CELL, COLS * CELL, 3), dtype=int)
    rgb[:HEIGHT] = np.asarray(background.convert("RGB")).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    sand = (r > 170) & (g > 140) & (b > 80) & (b < 190) & (r - b > 45) & (r >= g) & (g - b > 20)
    return sand.reshape(ROWS, CELL, COLS, CELL).mean(axis=(1, 3)) >= SAND_CELL_RATIO


def neighbours(cells):
    padded = np.pad(cells, 1)
    return sum(padded[1 + dy:ROWS + 1 + dy, 1 + dx:COLS + 1 + dx].astype(int)
               for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx, dy) != (0, 0))


def clean(cells):
    cells = cells | (neighbours(cells) >= 6)
    cells = cells & (neighbours(cells) >= 3)
    return cells


def water_cells(background):
    rgb = np.zeros((ROWS * CELL, COLS * CELL, 3), dtype=int)
    rgb[:HEIGHT] = np.asarray(background.convert("RGB")).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    water = (b > 150) & (b - r > 60)
    return water.reshape(ROWS, CELL, COLS, CELL).mean(axis=(1, 3)) >= 0.25


def widen(cells, blocked):
    # the diagonal roads are drawn only a little narrower than the 24px feet box + clearance: grow the road network by
    # one 8px cell onto its verge (never onto water or the explicit obstacles), like the castle town's verge widening
    return cells | ((neighbours(cells) >= 1) & ~blocked)


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
    blocked = water_cells(background)
    for rect in OBSTACLES:
        paint(blocked, rect, True)
    cells = widen(cells, blocked)
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
