# -*- coding: utf-8 -*-
"""Build assets/maps/rainland_throne_room/collision.png for the CURRENT レインランドじょう 王の間 background.

background.png (1448x1086) is byte-identical to assets/maps/reference/reference/レインランドじょう_城内2.png and is never
modified. Same method as tools/build_rainland_castle_collision.py: the walkable floor and the obstacles below were measured
from that artwork (grid-annotated zoom crops, then checked with --preview) and are the hand-fixable source of truth:

    python tools/build_rainland_throne_room_collision.py                     # rewrite collision.png
    python tools/build_rainland_throne_room_collision.py --preview out.png   # + the background with blocked areas tinted red

white = walkable / black = blocked. All coordinates are native background pixels (the Scene multiplies them by worldScale).
Every edge is a multiple of the 8px runtime cell (map.json collisionCellSize).

The 3D view (src/config/rainlandCastle3D.ts RAINLAND_THRONE_ROOM_3D) raises the dais/stairs and draws the throne, candelabra,
pedestals and balustrades on the same rectangles, so keep the two in sync when re-measuring.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = REPO_ROOT / "assets" / "maps" / "rainland_throne_room"

WIDTH, HEIGHT = 1448, 1086
CELL = 8

# Walkable floor (x0, y0, x1, y1), x1 / y1 exclusive.
WALKABLE = [
    # south entrance stem between the two sconce pillars (the exit zone in events.json sits at its bottom)
    ("entrance stem", (656, 960, 800, 1056)),
    ("entrance corridor", (648, 856, 800, 960)),
    ("lower hall", (592, 776, 856, 856)),
    # the long hall with the candle pedestals on both sides of the carpet
    ("main hall", (488, 368, 960, 776)),
    # the floor strips beside the wing openings, south of the wing pillars
    ("main hall west strip", (464, 600, 488, 776)),
    ("main hall east strip", (960, 600, 984, 776)),
    # west / east wings (L-shaped carpets) and the openings into the hall
    ("west wing", (312, 448, 456, 600)),
    ("west opening", (456, 504, 488, 600)),
    ("east wing", (992, 448, 1136, 600)),
    ("east opening", (960, 504, 992, 600)),
    # carpeted stairs up to the dais, and the dais in front of the throne
    ("dais stairs", (640, 288, 792, 368)),
    ("dais", (544, 192, 904, 288)),
]

# Blocked objects standing on the floor (x0, y0, x1, y1).
OBSTACLES = [
    # candle pedestals beside the carpet (two per side)
    (544, 400, 592, 536), (544, 584, 592, 728), (856, 400, 904, 536), (856, 584, 904, 728),
    # the throne
    (680, 144, 776, 248),
    # standing candelabra and potted topiaries on the dais
    (608, 176, 648, 208), (800, 176, 840, 208), (552, 192, 600, 240), (848, 192, 896, 240),
    # potted topiaries in the wings
    (400, 448, 448, 504), (1000, 448, 1048, 504),
]


def check_grid(rect):
    for value in rect:
        assert value % CELL == 0, f"{rect} is not aligned to the {CELL}px cell grid"


def rect_box(rect):
    x0, y0, x1, y1 = rect
    return (x0, y0, x1 - 1, y1 - 1)


def build(preview=None):
    collision = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    mask = ImageDraw.Draw(collision)
    for _, rect in WALKABLE:
        check_grid(rect)
        mask.rectangle(rect_box(rect), fill=(255, 255, 255))
    for rect in OBSTACLES:
        check_grid(rect)
        mask.rectangle(rect_box(rect), fill=(0, 0, 0))
    collision.save(MAP_DIR / "collision.png", optimize=True)
    print(f"wrote {MAP_DIR / 'collision.png'} ({WIDTH}x{HEIGHT})")

    if preview:
        background = Image.open(MAP_DIR / "background.png").convert("RGB")
        assert background.size == (WIDTH, HEIGHT), f"background.png is {background.size}, expected {(WIDTH, HEIGHT)}"
        red = Image.new("RGB", background.size, (255, 0, 0))
        tint = collision.convert("L").point(lambda v: 120 if v < 128 else 0)
        Image.composite(red, background, tint).save(preview)
        print(f"wrote preview {preview}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="also write the background with blocked areas tinted red to this path")
    build(parser.parse_args().preview)
