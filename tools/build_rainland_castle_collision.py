# -*- coding: utf-8 -*-
"""Build assets/maps/rainland_castle/collision.png for the CURRENT No.05 レインランドじょう background.

background.png (1448x1086, user-supplied 城内 artwork, byte-identical to
assets/maps/reference/reference/レインランドじょう_城内.png) is never modified. The walkable floor and the
obstacles below were measured from that artwork (grid-annotated zoom crops, then checked with --preview) and
are the hand-fixable source of truth for collision.png:

    python tools/build_rainland_castle_collision.py                 # rewrite collision.png
    python tools/build_rainland_castle_collision.py --preview out.png   # + the background with blocked areas tinted red

white = walkable / black = blocked. All coordinates are native background pixels (the Scene multiplies them by
worldScale). Every edge is a multiple of the 8px runtime cell (map.json collisionCellSize) so the mask, the runtime
Collision and this description agree exactly; the only exception is the bottom map edge (1086).

When the background is replaced again: re-measure the rectangles below, rerun this script, then re-place the
spawn / NPC / event coordinates (src/config/maps.ts, events.json). The Scene code does not depend on any of it.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = REPO_ROOT / "assets" / "maps" / "rainland_castle"

WIDTH, HEIGHT = 1448, 1086
CELL = 8

# Walkable floor (x0, y0, x1, y1), x1 / y1 exclusive. Inset a few px from the drawn walls so the feet box
# (a small box at the character's feet) never appears to stand inside a wall.
WALKABLE = [
    # south gate stem below the carpet: reaches the bottom edge (the exit zone in events.json sits here)
    ("gate stem", (656, 1000, 792, HEIGHT)),
    # entrance hall (lamp posts and topiaries flank the carpet)
    ("entrance hall", (512, 832, 936, 1000)),
    # central hall
    ("central hall", (320, 568, 1128, 840)),
    ("central hall north", (336, 520, 1112, 568)),
    # north: carpet up to the throne room door, plus the floor strips beside it below the banners
    ("throne route carpet", (656, 136, 792, 520)),
    ("throne route strip W", (608, 296, 656, 520)),
    ("throne route strip E", (792, 296, 848, 520)),
    # west wing: connecting corridor, the carpeted hall and the stairs at its north end
    ("west connect", (248, 568, 328, 656)),
    ("west wing", (104, 336, 248, 656)),
    ("west stairs", (120, 200, 232, 336)),
    # east wing: connecting corridor and the L-shaped carpeted hall leading to the small room at its north end
    # (the 24px floor strip behind the console table is left blocked: too narrow for the feet box to enter)
    ("east connect", (1120, 568, 1344, 656)),
    ("east wing", (1224, 344, 1344, 568)),
]

# Blocked objects standing on the floor (x0, y0, x1, y1).
OBSTACLES = [
    # stone pedestals flanking the carpet, three per side
    *[(x0, y0, x1, y1) for (x0, x1) in ((568, 608), (840, 880)) for (y0, y1) in ((520, 608), (616, 712), (728, 824))],
    # potted topiaries in the central hall corners
    (344, 480, 392, 560), (344, 752, 392, 824), (1056, 480, 1104, 560), (1056, 752, 1104, 824),
    # framed picture + bench (south-west of the hall)
    (424, 752, 504, 840),
    # lamp posts and topiaries beside the entrance carpet
    (616, 912, 656, 1000), (792, 912, 832, 1000), (592, 952, 624, 1000), (824, 952, 856, 1000),
    # torch bases on the west wing walls
    (96, 408, 128, 448), (224, 416, 248, 448),
]


def check_grid(rect):
    for value in (rect[0], rect[1], rect[2]) + ((rect[3],) if rect[3] != HEIGHT else ()):
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
