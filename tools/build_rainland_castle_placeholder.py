# -*- coding: utf-8 -*-
"""Build the DEV_PLACEHOLDER background + collision for No.05 レインランドじょう.

There is no user-supplied walkable interior artwork for the castle yet
(レインランドじょう_イメージ.png is the exterior establishing shot used by the town's
entry splash, and レインランドじょう_マイクラ風.png is a first-person voxel-castle reference;
neither is a top-down RPG map). Until real art exists this script draws a flat-colour
layout diagram and the matching Collision Mask from ONE description, so the two never drift:

    python tools/build_rainland_castle_placeholder.py

Outputs (assets/maps/rainland_castle/):
    background.png  flat-colour layout, ASCII labels only (DEV_PLACEHOLDER, never shipped art)
    collision.png   white = walkable / black = blocked, same size as background.png

When the real background arrives: replace background.png, rebuild collision.png from it
(the usual image-analysis + hand-fix workflow, see docs/MAP_SYSTEM.md), update map.json
width/height + assetStatus to CURRENT, and re-measure the spawn / event / NPC coordinates
in src/config/maps.ts and events.json. Nothing in the Scene depends on this layout.

All coordinates are native background pixels (the Scene multiplies them by worldScale).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "assets" / "maps" / "rainland_castle"

WIDTH, HEIGHT = 1448, 1086
# The runtime turns collision.png into 8px cells (map.json collisionCellSize). Rectangle edges are snapped to that
# grid so the drawn background, the mask and the runtime Collision all agree exactly.
CELL = 8

# (name, (x0, y0, x1, y1), floor colour). x1 / y1 are exclusive. The map border is always wall,
# except the gate that reaches the bottom edge (the exit zone in events.json sits there).
WALKABLE = [
    ("gate", (645, 1030, 805, 1086), (120, 150, 120)),
    ("entrance hall", (470, 860, 980, 1030), (150, 146, 140)),
    ("central hall", (300, 440, 1150, 860), (176, 170, 160)),
    ("throne route", (600, 200, 850, 440), (198, 186, 150)),
    ("throne door recess", (665, 150, 785, 200), (198, 186, 150)),
    # west wing: corridor from the hall, then north to the stairs
    ("west connect", (110, 560, 300, 700), (150, 160, 176)),
    ("west corridor", (110, 240, 250, 700), (150, 160, 176)),
    # east wing: corridor from the hall, then north to a small side room
    ("east connect", (1150, 560, 1340, 700), (170, 150, 176)),
    ("east corridor", (1210, 300, 1340, 700), (170, 150, 176)),
    ("east side room", (1160, 240, 1340, 330), (170, 150, 176)),
]

# Walkable, drawn on top of the floor (no collision effect).
CARPET = (150, 40, 50)
CARPET_RECTS = [(640, 200, 810, 1030), (665, 150, 785, 200)]
STAIRS = (110, 240, 250, 320)
STAIR_COLORS = ((214, 214, 220), (168, 168, 178))

# Blocked obstacles inside the walkable rooms.
OBSTACLE_COLOR = (84, 76, 88)
OBSTACLES = [
    # pillars flanking the carpet, three rows
    *[(x, y, x + 50, y + 50) for x in (555, 845) for y in (510, 630, 750)],
    # long tables
    (1010, 460, 1110, 540),
    (340, 770, 450, 830),
]

WALL_COLOR = (34, 30, 44)
DOOR_COLOR = (120, 76, 34)
THRONE_DOOR = (675, 110, 775, 150)  # in the wall band above the recess (blocked, just drawn)

LABELS = [
    (150, 30, "DEV_PLACEHOLDER  RAINLAND CASTLE (No.05)  replace with real art"),
    (655, 1050, "EXIT"),
    (590, 700, "CENTRAL HALL"),
    (600, 70, "THRONE ROOM DOOR"),
    (112, 205, "STAIRS UP"),
    (1160, 215, "EVENT SLOT"),
]


def snap(value):
    return round(value / CELL) * CELL


def rect_box(rect):
    x0, y0, x1, y1 = (snap(v) for v in rect)
    return (x0, y0, x1 - 1, y1 - 1)


def load_font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # very old Pillow without a sized default font
        return ImageFont.load_default()


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    background = Image.new("RGB", (WIDTH, HEIGHT), WALL_COLOR)
    draw = ImageDraw.Draw(background)
    for _, rect, color in WALKABLE:
        draw.rectangle(rect_box(rect), fill=color)
    for rect in CARPET_RECTS:
        draw.rectangle(rect_box(rect), fill=CARPET)
    x0, y0, x1, y1 = (snap(v) for v in STAIRS)
    for index, y in enumerate(range(y0, y1, 16)):
        draw.rectangle((x0, y, x1 - 1, min(y + 15, y1 - 1)), fill=STAIR_COLORS[index % 2])
    for rect in OBSTACLES:
        draw.rectangle(rect_box(rect), fill=OBSTACLE_COLOR)
    draw.rectangle(rect_box(THRONE_DOOR), fill=DOOR_COLOR)
    font = load_font(24)
    for x, y, text in LABELS:
        draw.text((x, y), text, fill=(20, 20, 24), font=font, stroke_width=2, stroke_fill=(236, 236, 240))
    background.save(OUT_DIR / "background.png", optimize=True)

    collision = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    mask = ImageDraw.Draw(collision)
    for _, rect, _ in WALKABLE:
        mask.rectangle(rect_box(rect), fill=(255, 255, 255))
    for rect in OBSTACLES:
        mask.rectangle(rect_box(rect), fill=(0, 0, 0))
    collision.save(OUT_DIR / "collision.png", optimize=True)
    print(f"wrote {OUT_DIR / 'background.png'} and {OUT_DIR / 'collision.png'} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    build()
