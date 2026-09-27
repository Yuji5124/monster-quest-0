# -*- coding: utf-8 -*-
"""Build collision.png for the three floors of No.13 コタンカイムの洞窟.

    kotankaim_cave_1/background.png = assets/maps/reference/reference/コタンカイムのどうくつ1.png (byte-identical)
    kotankaim_cave_2/background.png = assets/maps/reference/reference/コタンカイムのどうくつ2.png (byte-identical)
    kotankaim_cave_3/background.png = assets/maps/reference/reference/コタンカイムのどうくつ3.png (byte-identical)

The backgrounds are never modified. Same method as tools/build_iwayama_cave_collision.py: each 8px runtime cell
(map.json collisionCellSize) whose pixels are mostly the pale sandy floor becomes walkable, the result is cleaned
(holes filled, isolated specks dropped) and grown onto the neighbouring partly-floor cells, the hand-measured
rectangles below add what is not floor-coloured (wooden bridges, stone stairs, the doorways) or cut out what must stay
blocked (ruined pillars and arches, whose pale tops pass the colour test), and only the network connected to the
floor's entrance is kept. Cliff faces, the water, the waterfalls and the rock spires stay blocked.

    python tools/build_kotankaim_cave_collision.py                       # rewrite the three collision.png files
    python tools/build_kotankaim_cave_collision.py --preview out_dir     # + backgrounds with blocked areas tinted red

white = walkable / black = blocked. Coordinates are native background pixels (the Scene multiplies them by worldScale).
1086 is not a multiple of 8, so the cell grid is computed on 1088 rows and cropped back to 1086.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MAPS_DIR = REPO_ROOT / "assets" / "maps"

WIDTH, HEIGHT = 1448, 1086
CELL = 8
COLS, ROWS = WIDTH // CELL, -(-HEIGHT // CELL)
FLOOR_CELL_RATIO = 0.35
WIDEN_CELL_RATIO = 0.08
WIDEN_PASSES = 3

# (x0, y0, x1, y1), x1 / y1 exclusive, multiples of CELL.
FLOORS = {
    "kotankaim_cave_1": {
        # the fromWorldMap spawn, on the sandy path that comes in from the south edge
        "seed": (736, 1016),
        "walkable": [
            ("west stone stairs", (160, 424, 200, 488)),
            ("shaded gravel path (upper band -> west plateau)", (24, 144, 88, 208)),
            ("shaded gravel path (lower)", (0, 200, 56, 296)),
            ("gravel behind the west arch", (40, 256, 128, 296)),
            ("through the west arch", (96, 288, 128, 400)),
            ("north-west stone stairs", (336, 168, 400, 256)),
            ("wooden ladder bridge (north ledge -> centre island)", (488, 296, 536, 400)),
            ("east wooden bridge", (1000, 480, 1104, 528)),
            ("east wooden ladder", (1104, 432, 1152, 496)),
            ("east stone stairs", (1232, 552, 1280, 640)),
            ("north-east door approach", (1168, 56, 1232, 128)),
            ("south plaza -> west path, between the pillars", (640, 760, 704, 808)),
            ("centre island: ladder foot -> north of the rock spire", (536, 360, 624, 408)),
            ("centre island: between the rock spire and the north-west pillar", (600, 400, 632, 456)),
            ("centre island grey cobble plaza around the arch", (680, 360, 880, 528)),
            ("centre island grey cobble path to the east bridge", (872, 400, 1008, 536)),
            ("east ladder top landing", (1096, 400, 1192, 440)),
            ("east path beside the pillar", (1152, 288, 1200, 408)),
            ("east path turning north-east", (1184, 232, 1264, 312)),
        ],
        "obstacles": [
            ("west plateau pillar", (176, 216, 216, 304)),
            ("west plateau pillar (east)", (240, 264, 272, 336)),
            ("west plateau arch (west leg)", (64, 320, 96, 400)),
            ("west plateau arch (east leg)", (128, 288, 176, 368)),
            ("west plateau pillar (west)", (24, 312, 64, 408)),
            ("centre pillar (north-west)", (632, 312, 672, 416)),
            ("centre arch (west leg)", (704, 384, 736, 464)),
            ("centre arch (east leg)", (776, 344, 816, 464)),
            ("centre pillar (north-east)", (824, 272, 872, 360)),
            ("centre pillar (south-east)", (864, 448, 904, 536)),
            ("centre pillar (south-west)", (640, 472, 680, 560)),
            ("east pillar", (1112, 296, 1152, 400)),
            ("east arch", (1240, 376, 1360, 480)),
            ("east pillar (by the arch)", (1352, 456, 1400, 544)),
            ("south pillar (west, upper)", (600, 664, 632, 720)),
            ("south pillar (west, lower)", (648, 696, 680, 760)),
            ("entrance pillar (west)", (656, 808, 696, 888)),
            ("entrance pillar (east)", (824, 808, 856, 888)),
            ("door pillar (west)", (1120, 24, 1160, 112)),
            ("door pillar (east)", (1240, 24, 1280, 112)),
        ],
    },
    "kotankaim_cave_2": {
        # the fromCave1 spawn, above the south stone stairs
        "seed": (720, 896),
        "walkable": [
            ("south stone stairs", (696, 904, 760, 1088)),
            ("north-west door approach", (168, 40, 216, 128)),
            ("central grey cobble plaza", (600, 344, 880, 544)),
            ("north wooden bridge", (464, 232, 560, 280)),
            ("west wooden bridge (plaza -> pillar island)", (496, 432, 600, 480)),
            ("east wooden bridge (plaza -> east path)", (872, 432, 984, 480)),
            ("south-east wooden bridge", (856, 656, 936, 704)),
            ("south-west diagonal wooden bridge (upper)", (552, 608, 608, 656)),
            ("south-west diagonal wooden bridge (lower)", (568, 640, 624, 688)),
            ("north-east small plateau stairs", (1008, 344, 1056, 424)),
            ("east floor below the stairs, above the rock clump", (1112, 576, 1168, 616)),
            ("east junction below the stairs", (1160, 592, 1208, 656)),
            ("south-west lower band -> top of the south stairs", (624, 864, 704, 896)),
            ("east plateau stone stairs down to the south-east band", (1160, 840, 1208, 920)),
        ],
        "obstacles": [
            ("door pillar (west)", (112, 8, 152, 104)),
            ("door pillar (east)", (224, 8, 256, 128)),
            ("west plateau arch (west leg)", (64, 272, 104, 368)),
            ("west plateau arch (east leg)", (136, 224, 192, 328)),
            ("west plateau pillar", (200, 288, 240, 368)),
            ("pillar island pillar", (432, 296, 472, 392)),
            ("south-west arch (west leg)", (224, 656, 264, 736)),
            ("south-west arch (east leg)", (288, 624, 328, 696)),
            ("south-west fallen lintel", (304, 680, 392, 768)),
            ("south-west pillar", (384, 656, 432, 752)),
            ("plaza pillar (west)", (600, 376, 648, 456)),
            ("plaza pillar (north)", (688, 304, 728, 400)),
            ("plaza arch (west leg)", (704, 408, 744, 536)),
            ("plaza arch (east leg)", (768, 432, 816, 536)),
            ("plaza pillar (east)", (808, 376, 856, 456)),
            ("north-east small plateau pillar", (1000, 248, 1040, 352)),
            ("north-east pillar (west)", (1184, 40, 1224, 128)),
            ("north-east pillar (east)", (1232, 80, 1272, 168)),
            ("north-east broken block", (1168, 128, 1200, 168)),
            ("north-east arch (west leg)", (1280, 152, 1320, 216)),
            ("north-east arch (east leg)", (1336, 152, 1376, 256)),
            ("east plateau pillar", (1096, 704, 1136, 784)),
            ("east plateau arch (west leg)", (1152, 704, 1200, 808)),
            ("east plateau arch (east leg)", (1248, 720, 1288, 792)),
            ("east plateau pillar (north)", (1280, 640, 1320, 728)),
            ("south stairs pillar (west)", (648, 896, 688, 992)),
            ("south stairs pillar (east)", (760, 896, 800, 984)),
        ],
    },
    "kotankaim_cave_3": {
        # the fromCave2 spawn, above the south stone stairs
        "seed": (720, 880),
        "walkable": [
            ("south stone stairs", (696, 904, 760, 1088)),
            ("stairs up to the central plaza", (704, 616, 752, 712)),
            ("stairs up to the middle ledge", (696, 344, 752, 416)),
            ("stairs up to the sigil hall", (696, 200, 752, 312)),
            ("south-west wooden bridge", (504, 712, 592, 760)),
            ("south-east wooden bridge", (864, 712, 952, 760)),
            ("north-west wooden bridge", (336, 328, 424, 384)),
            ("north-east wooden bridge", (1024, 328, 1112, 384)),
            ("west stone stairs", (176, 400, 224, 488)),
            ("east stone stairs", (1224, 400, 1272, 488)),
        ],
        "obstacles": [
            # the ring of pillars and the back wall around the sigil (magic circle)
            ("sigil hall back wall", (576, 0, 872, 72)),
            ("sigil hall pillar (outer west)", (528, 64, 576, 176)),
            ("sigil hall pillar (north-west)", (584, 8, 624, 112)),
            ("sigil hall pillar (west, inner)", (584, 112, 624, 184)),
            ("sigil hall arch (west leg)", (624, 24, 672, 120)),
            ("sigil hall pillar (south-west)", (632, 152, 672, 232)),
            ("sigil hall pillar (north-east)", (776, 16, 816, 112)),
            ("sigil hall pillar (east)", (824, 8, 864, 112)),
            ("sigil hall pillar (east, inner)", (824, 112, 864, 160)),
            ("sigil hall pillar (outer east)", (880, 64, 920, 176)),
            ("sigil hall pillar (south-east)", (784, 152, 824, 232)),
            ("central plaza pillar (west)", (640, 408, 680, 496)),
            ("central plaza pillar (east)", (776, 400, 816, 488)),
            ("central plaza arch (west leg)", (680, 480, 728, 592)),
            ("central plaza arch (east leg)", (752, 488, 800, 592)),
            ("central plaza pillar (far east)", (832, 456, 872, 552)),
            ("south plaza pillar (west)", (640, 712, 680, 784)),
            ("south plaza pillar (east)", (776, 712, 816, 784)),
            ("south stairs pillar (west)", (640, 888, 680, 1000)),
            ("south stairs pillar (east)", (768, 888, 808, 992)),
            ("south plaza small pillar (west)", (552, 848, 584, 912)),
            ("south plaza small pillar (east)", (864, 888, 904, 936)),
            ("north-west arch (west leg)", (48, 288, 88, 392)),
            ("north-west arch (east leg)", (120, 256, 152, 344)),
            ("north-west pillar", (176, 288, 216, 384)),
            ("west arch (west leg)", (240, 544, 280, 640)),
            ("west arch (east leg)", (320, 552, 360, 672)),
            ("south-west pillar", (320, 800, 360, 880)),
            ("north-east pillar", (1232, 288, 1272, 384)),
            ("north-east arch (west leg)", (1288, 248, 1328, 344)),
            ("north-east arch (east leg)", (1352, 280, 1400, 392)),
            ("north-east pillar (south)", (1296, 344, 1336, 416)),
            ("north-east pillar (north)", (1352, 168, 1384, 240)),
            ("east arch (west leg)", (1104, 560, 1144, 672)),
            ("east arch (east leg)", (1168, 544, 1200, 624)),
            ("south-east pillar", (1080, 800, 1120, 912)),
        ],
    },
}


def floor_ratio(background):
    rgb = np.asarray(background.convert("RGB")).astype(int)
    rgb = np.pad(rgb, ((0, ROWS * CELL - HEIGHT), (0, 0), (0, 0)))
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    floor = (r > 120) & (g > 105) & (r - b > 20) & (r - b < 110) & (r >= g)
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
    # the sandy floor is edged with a darker rocky rim, so its colour mask comes out a little narrower than the drawn
    # path: grow onto neighbouring cells that are still partly floor (never onto the cliffs or the water, ~0 floor)
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
    for _, rect in config["obstacles"]:
        paint(cells, rect, False)
    seed = config["seed"]
    cells = connected_from(cells, (seed[1] // CELL, seed[0] // CELL))

    full = Image.fromarray((cells * 255).astype("uint8")).resize((COLS * CELL, ROWS * CELL), Image.NEAREST)
    mask = full.crop((0, 0, WIDTH, HEIGHT)).convert("RGB")
    mask.save(map_dir / "collision.png", optimize=True)
    print(f"wrote {map_dir / 'collision.png'} ({WIDTH}x{HEIGHT}, walkable cells={int(cells.sum())})")

    if preview_dir:
        Path(preview_dir).mkdir(parents=True, exist_ok=True)
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
