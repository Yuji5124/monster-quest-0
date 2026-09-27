# -*- coding: utf-8 -*-
"""Build assets/maps/dakoha_port/collision.png for the CURRENT No.12 港町ダコハ background.

background.png (1448x1086) is byte-identical to assets/maps/reference/reference/港町ダコハ.png and is never modified.
Same method as tools/build_zabon_village_collision.py: each 8px runtime cell (map.json collisionCellSize) whose pixels
are mostly the light cobblestone colour becomes walkable, the result is cleaned (holes in the cobbles filled, isolated
specks dropped), the hand-measured rectangles below add what is not cobble-coloured (stone stairs, wooden piers) or
remove what must stay blocked, and only the network connected to the north gate (the world-map entrance) is kept.
The cobbles are drawn right up to walls and water, so unlike the village roads no verge widening is applied.

    python tools/build_dakoha_port_collision.py                    # rewrite collision.png
    python tools/build_dakoha_port_collision.py --preview out.png  # + the background with blocked areas tinted red

white = walkable / black = blocked. Coordinates are native background pixels (the Scene multiplies them by
worldScale). 1086 is not a multiple of 8, so the cell grid is computed on 1088 rows and cropped back to 1086.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = REPO_ROOT / "assets" / "maps" / "dakoha_port"

WIDTH, HEIGHT = 1448, 1086
CELL = 8
COLS, ROWS = WIDTH // CELL, -(-HEIGHT // CELL)

COBBLE_CELL_RATIO = 0.5
# Cell the connected network is grown from (= the fromWorldMap spawn on the landing below the north gate).
SEED = (612, 128)

# Walkable additions (x0, y0, x1, y1), x1 / y1 exclusive, multiples of CELL.
WALKABLE = [
    # the north gate's doorway (world-map exit event) and the landing in front of it, between the two fences
    ("north gate doorway", (592, 48, 632, 80)),
    ("north gate landing", (560, 72, 664, 104)),
    # the long central stone stairs from the gate landing down to the fountain plaza (grey steps fail the colour test)
    ("central stairs", (584, 96, 640, 352)),
    # the plaza is drawn with stalls, lamp posts, planters and barrels that leave gaps narrower than the player's feet box
    # + clearance in the colour mask: guarantee body-wide corridors along the paved routes the artwork shows
    ("fountain north", (496, 352, 704, 408)),
    ("fountain west passage", (496, 408, 544, 504)),
    ("fountain east passage", (688, 408, 752, 504)),
    ("lower plaza", (232, 504, 752, 544)),
    ("quay steps approach", (576, 544, 648, 584)),
    ("harbour front", (576, 600, 1000, 632)),
    ("upper west terrace", (152, 184, 288, 216)),
    ("west ramp foot", (192, 408, 256, 472)),
    ("west middle path", (448, 304, 584, 352)),
    ("west middle stairs foot", (408, 296, 464, 336)),
    # the lane down the west edge between the houses and the town wall, and the terrace above the south-west stairs
    ("west lane", (160, 512, 248, 672)),
    ("south-west terrace", (120, 696, 240, 728)),
    # west terraces: stairs between the upper house row and the middle row, and the stone ramp past the blue house
    ("west upper stairs", (200, 216, 256, 304)),
    ("west middle stairs", (408, 224, 456, 304)),
    ("west stone ramp", (192, 296, 248, 416)),
    ("west lower stairs", (232, 464, 280, 520)),
    # south-west: steps down the terrace and the diagonal stairs to the lower quay, the boardwalk to the long pier
    ("south-west terrace steps", (128, 664, 184, 704)),
    ("south-west diagonal stairs", (176, 720, 232, 784)),
    ("south-west boardwalk", (240, 800, 336, 840)),
    # the long wooden pier on the west side of the harbour and its cross deck at the far end
    ("west long pier", (336, 640, 400, 968)),
    ("west pier cross deck", (320, 904, 408, 936)),
    # steps from the plaza down to the quay, the wooden end of the central stone dock, the east pier
    ("quay steps", (584, 576, 648, 616)),
    ("central dock end", (576, 752, 640, 848)),
    ("east pier", (952, 600, 1016, 752)),
    # east side: stairs from the harbour up to the upper road, the path and stairs to the lighthouse
    ("east stairs", (1072, 368, 1128, 424)),
    ("lighthouse stairs", (1176, 216, 1232, 280)),
    ("lighthouse path", (1200, 184, 1320, 224)),
    # the east quay's cobbles are darker than the plaza's and fail the colour test: the walkway along the harbour edge
    # below the crates, the lower east dock, the stairs up to the crane quay and the crane quay itself
    ("east quay walkway", (1000, 584, 1208, 632)),
    ("east dock head", (1200, 560, 1248, 600)),
    ("east dock", (1200, 600, 1360, 704)),
    ("east jetty stairs", (1208, 512, 1256, 568)),
    ("crane quay", (1056, 424, 1176, 520)),
    ("crane quay east", (1176, 448, 1256, 520)),
    ("east jetty", (1256, 496, 1344, 528)),
    # the diagonal ramp from the top of the east stairs up to the lighthouse stairs
    ("east ramp low", (1088, 320, 1152, 376)),
    ("east ramp mid", (1112, 272, 1184, 328)),
    ("east ramp high", (1144, 232, 1216, 288)),
]

# Blocked areas (x0, y0, x1, y1) that the colour mask would otherwise let through.
OBSTACLES = [
    # the fountain and its flower beds in the middle of the plaza
    (544, 424, 688, 496),
    # the crane's post on the east quay and the flower planter at the head of the east dock
    (1064, 456, 1088, 520),
    (1248, 576, 1296, 624),
]


def cobble_cells(background):
    rgb = np.zeros((ROWS * CELL, COLS * CELL, 3), dtype=int)
    rgb[:HEIGHT] = np.asarray(background.convert("RGB")).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    cobble = (r > 205) & (g > 180) & (b > 140) & (b < 215) & (r - b > 30) & (r - b < 95) & (r >= g)
    return cobble.reshape(ROWS, CELL, COLS, CELL).mean(axis=(1, 3)) >= COBBLE_CELL_RATIO


def neighbours(cells):
    padded = np.pad(cells, 1)
    return sum(padded[1 + dy:ROWS + 1 + dy, 1 + dx:COLS + 1 + dx].astype(int)
               for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx, dy) != (0, 0))


def clean(cells):
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
    cells = clean(cobble_cells(background))
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
