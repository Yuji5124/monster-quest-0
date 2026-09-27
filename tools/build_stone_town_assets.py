# -*- coding: utf-8 -*-
"""Build the DEV_PLACEHOLDER walking assets for No.18 いしのまち (assets/maps/stone_town).

The user supplied only the atmospheric illustration いしのまち_イメージ.png (used unmodified as entry_splash.png). No top-down
walking background exists yet, so this tool paints a placeholder 1448x1086 stone town and derives collision.png from the
SAME layout, which keeps art and collision from drifting apart. When the official background arrives, replace
background.png, set assetStatus to CURRENT in map.json, re-derive collision from the artwork, and re-place objects.json /
events.json rectangles (their gameplay meaning does not change).

    python tools/build_stone_town_assets.py                       # background.png + collision.png
    python tools/build_stone_town_assets.py --collision-only      # collision.png only (fast)
    python tools/build_stone_town_assets.py --preview out.png     # + the background with blocked areas tinted red

white = walkable / black = blocked. All coordinates are native background pixels (the Scene multiplies by worldScale 1.5).
Statues are the user's villager sprites (assets/characters/npc) turned to stone and pasted into the background at the
rectangles of the `statue` objects in objects.json. The barrier and the plaza's glowing star are drawn at runtime.
"""
import argparse
import json
import math
import random
import zlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = REPO_ROOT / "assets" / "maps" / "stone_town"
NPC_DIR = REPO_ROOT / "assets" / "characters" / "npc"

W, H, CELL = 1448, 1086, 8
SS = 2  # supersampling for the painted shapes

# ----------------------------------------------------------------------------------------------------------------------
# LAYOUT (native px). WALK zones are unions of rectangles; everything else is blocked. BLOCK shapes are cut out of WALK.
# ----------------------------------------------------------------------------------------------------------------------
WALK = {
    "north_gate_walk": (656, 0, 792, 88),
    "terrace": (536, 72, 912, 216),
    "stairs": (648, 208, 800, 328),
    "plaza": (416, 320, 1032, 760),
    "neck": (456, 760, 992, 912),
    "gate_road": (600, 912, 848, 1086),
    "west_terrace": (96, 512, 424, 760),
    "quay": (1032, 400, 1104, 776),
    "bridge": (1096, 560, 1248, 656),
    "east_bank": (1240, 480, 1424, 808),
}

FOUNTAIN = (724, 560)  # basin centre
BASIN_RX, BASIN_RY = 190, 88  # blocked ellipse (the painted rim is slightly smaller)

BLOCK_RECTS = {
    "planter_nw": (416, 320, 464, 368),
    "planter_ne": (984, 320, 1032, 368),
    "planter_sw": (416, 712, 464, 760),
    "planter_se": (984, 712, 1032, 760),
    "statue_column": (688, 376, 760, 488),
    "lamp_plaza_nw": (472, 392, 488, 408),
    "lamp_plaza_ne": (960, 392, 976, 408),
    "lamp_plaza_sw": (472, 712, 488, 728),
    "lamp_plaza_se": (968, 736, 984, 752),
    "well": (892, 656, 948, 704),
    "bakery_counter": (96, 512, 232, 544),
    "barrels": (96, 596, 152, 652),
    "west_crates": (104, 704, 160, 752),
    "merchant_counter": (1256, 520, 1352, 552),
    "east_crates": (1372, 720, 1420, 780),
    "lamp_quay_n": (1048, 440, 1064, 456),
    "lamp_quay_s": (1048, 712, 1064, 728),
    "lamp_terrace_w": (560, 96, 576, 112),
    "lamp_terrace_e": (872, 96, 888, 112),
    "neck_planter_w": (472, 776, 520, 808),
    "neck_planter_e": (928, 776, 976, 808),
    "terrace_rail_w": (536, 72, 552, 208),
    "terrace_rail_e": (896, 72, 912, 208),
    "merchant_stall_back": (1240, 480, 1360, 520),
}

# Object types that are painted into the background and blocked by the mask (their rect is the footprint).
BLOCKED_OBJECT_TYPES = {"statue"}

# Stone palette (petrified town: grey with a cool cast; only lamps, moss and water keep a little colour).
COB_BASE = (166, 165, 168)
GROUT = (86, 88, 98)
WALL = (172, 170, 172)
ROOFS = [(98, 106, 126), (112, 108, 116), (92, 112, 118), (120, 114, 108), (104, 100, 120)]
WATER = (92, 132, 154)
MOSS = (96, 124, 84)


def s(v):
    return int(round(v * SS))


def shade(c, f):
    return tuple(max(0, min(255, int(round(v * f)))) for v in c[:3]) + tuple(c[3:])


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


# ----------------------------------------------------------------------------------------------------------------------
# COLLISION
# ----------------------------------------------------------------------------------------------------------------------
def load_objects():
    return json.loads((MAP_DIR / "objects.json").read_text(encoding="utf-8"))["objects"]


def build_walk_mask(objects):
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    for x0, y0, x1, y1 in WALK.values():
        d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=255)
    for x0, y0, x1, y1 in BLOCK_RECTS.values():
        d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=0)
    cx, cy = FOUNTAIN
    d.ellipse([cx - BASIN_RX, cy - BASIN_RY, cx + BASIN_RX, cy + BASIN_RY], fill=0)
    for obj in objects:
        if obj["type"] in BLOCKED_OBJECT_TYPES:
            x, y, w, h = obj["x"], obj["y"], obj["width"], obj["height"]
            d.rectangle([x, y, x + w - 1, y + h - 1], fill=0)
    return mask


def build_collision(objects):
    mask = np.asarray(build_walk_mask(objects)) > 127
    rows, cols = -(-H // CELL), W // CELL
    padded = np.zeros((rows * CELL, cols * CELL), dtype=bool)
    padded[:H, :W] = mask
    cells = padded.reshape(rows, CELL, cols, CELL).mean(axis=(1, 3)) >= 0.5
    out = np.kron(cells, np.ones((CELL, CELL), dtype=np.uint8))[:H, :W] * 255
    image = Image.fromarray(out.astype("uint8")).convert("RGB")
    image.save(MAP_DIR / "collision.png", optimize=True)
    print(f"wrote {MAP_DIR / 'collision.png'} ({W}x{H}, walkable cells={int(cells.sum())})")
    return image


# ----------------------------------------------------------------------------------------------------------------------
# PAINTING
# ----------------------------------------------------------------------------------------------------------------------
class Painter:
    def __init__(self, image):
        self.im = image
        self.d = ImageDraw.Draw(image, "RGBA")

    def rect(self, x0, y0, x1, y1, fill=None, outline=None, w=1, r=0):
        box = [s(x0), s(y0), s(x1) - 1, s(y1) - 1]
        if r:
            self.d.rounded_rectangle(box, radius=s(r), fill=fill, outline=outline, width=max(1, s(w)))
        else:
            self.d.rectangle(box, fill=fill, outline=outline, width=max(1, s(w)))

    def ellipse(self, cx, cy, rx, ry, fill=None, outline=None, w=1):
        self.d.ellipse([s(cx - rx), s(cy - ry), s(cx + rx) - 1, s(cy + ry) - 1], fill=fill, outline=outline, width=max(1, s(w)))

    def poly(self, pts, fill=None, outline=None):
        self.d.polygon([(s(x), s(y)) for x, y in pts], fill=fill, outline=outline)

    def line(self, pts, fill, w=1):
        self.d.line([(s(x), s(y)) for x, y in pts], fill=fill, width=max(1, s(w)), joint="curve")

    def arc_poly(self, cx, cy, rx, ry, a0, a1, fill, steps=24):
        pts = [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / steps)),
                cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / steps))) for i in range(steps + 1)]
        self.poly(pts, fill=fill)


def smooth_noise(shape, sigma, rng):
    a = rng.normal(size=shape).astype(np.float32)
    a = ndimage.gaussian_filter(a, sigma)
    return (a - a.mean()) / (a.std() + 1e-6)


def make_rock(rng):
    """Cliff rock lit from the upper left (embossed noise) with muted moss; the look of every blocked area."""
    h, w = H * SS, W * SS
    big = smooth_noise((h, w), 46 * SS / 2, rng)
    mid = smooth_noise((h, w), 9 * SS / 2, rng)
    small = smooth_noise((h, w), 2.2 * SS / 2, rng)
    height = big * 1.0 + mid * 0.7 + small * 0.22
    gy, gx = np.gradient(height)
    light = np.clip((-(gx * 0.8 + gy * 1.0)) * 5.0, -1, 1)
    strata = np.sin((np.arange(h)[:, None] / SS) * 0.31 + big * 1.4)
    lum = 1.0 + 0.24 * light + 0.06 * big + 0.04 * strata
    base = np.array([124, 126, 136], dtype=np.float32)
    arr = base[None, None, :] * lum[..., None]
    moss = np.clip((mid - 0.55) * 1.6, 0, 1) * np.clip((big + 0.6) * 0.8, 0, 1)
    arr = arr * (1 - 0.42 * moss[..., None]) + np.array([92, 118, 88], dtype=np.float32) * 0.42 * moss[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def cypress(p, x, y_feet, hgt, rng):
    """A muted cypress/pine standing in a gap between the hillside houses."""
    p.ellipse(x + 3, y_feet, hgt * 0.22, 3, fill=(0, 0, 0, 60))
    p.rect(x - 1.4, y_feet - 6, x + 1.4, y_feet, fill=(96, 86, 78))
    for k in range(4):
        rw = hgt * (0.20 - 0.035 * k)
        cy = y_feet - hgt * (0.22 + 0.2 * k)
        col = mix((66, 92, 72), (92, 122, 90), rng.random() * 0.5 + 0.2)
        p.ellipse(x, cy, rw, hgt * 0.22, fill=col)
        p.ellipse(x - rw * 0.3, cy - hgt * 0.05, rw * 0.5, hgt * 0.12, fill=shade(col, 1.22))


def make_cobbles(size_px, rng, base=COB_BASE, stone_w=(15, 26), stone_h=(11, 15), seed_shift=0):
    """A cobblestone layer (RGB) of `size_px` at SS scale with grout, bevel and low-frequency tone variation."""
    w, h = size_px
    im = Image.new("RGB", (w, h), GROUT)
    d = ImageDraw.Draw(im)
    py = 0
    while py < h:
        rh = int(s(rng.uniform(*stone_h)))
        px = -int(s(rng.uniform(0, stone_w[1])))
        while px < w:
            sw = int(s(rng.uniform(*stone_w)))
            tone = rng.uniform(0.86, 1.08)
            warm = rng.uniform(-6, 6)
            col = (int(base[0] * tone + warm), int(base[1] * tone), int(base[2] * tone - warm))
            g = max(1, s(1.1))
            box = [px + g, py + g, px + sw - g, py + rh - g]
            d.rounded_rectangle([box[0] + 1, box[1] + 1, box[2] + 1, box[3] + 1], radius=s(3), fill=shade(col, 0.72))
            d.rounded_rectangle(box, radius=s(3), fill=col)
            d.line([(box[0] + s(2), box[1] + 1), (box[2] - s(2), box[1] + 1)], fill=shade(col, 1.18), width=1)
            px += sw
        py += rh
    arr = np.asarray(im).astype(np.float32)
    tone = 1.0 + 0.055 * smooth_noise((h, w), 26 * SS / 2, rng)[..., None]
    grain = 1.0 + 0.018 * rng.normal(size=(h, w, 1)).astype(np.float32)
    return Image.fromarray(np.clip(arr * tone * grain, 0, 255).astype(np.uint8), "RGB")


def paste_masked(base, layer, mask):
    base.paste(layer, (0, 0), mask)


def ground_mask_ss():
    m = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(m)
    for x0, y0, x1, y1 in WALK.values():
        d.rectangle([s(x0), s(y0), s(x1) - 1, s(y1) - 1], fill=255)
    return m


# ---- buildings ---------------------------------------------------------------------------------------------------------
def house(p, x, y, w, h, roof, wall=WALL, door=True, windows=2, chimney=False, rng=None, flag=False, arch_door=True, moss=0.0):
    rng = rng or random.Random(x * 31 + y)
    rh = int(h * 0.54)
    wh = h - rh
    # wall with courses
    p.rect(x, y + rh - 6, x + w, y + h, fill=wall)
    yy = y + rh
    row = 0
    while yy < y + h:
        p.line([(x, yy), (x + w, yy)], shade(wall, 0.84), 0.8)
        off = 7 if row % 2 else 0
        vx = x + off
        while vx < x + w:
            p.line([(vx, yy), (vx, min(yy + 7, y + h))], shade(wall, 0.9), 0.7)
            vx += 14
        yy += 7
        row += 1
    p.rect(x, y + h - 6, x + w, y + h, fill=shade(wall, 0.7))
    p.rect(x, y + rh - 6, x + 3, y + h, fill=shade(wall, 1.12))  # sunlit left edge
    p.rect(x + w - 4, y + rh - 6, x + w, y + h, fill=shade(wall, 0.76))
    # door
    if door:
        dw = min(20, w * 0.22)
        dx = x + w / 2 - dw / 2
        dh = min(wh * 0.72, 34)
        p.rect(dx - 2, y + h - dh - 2, dx + dw + 2, y + h, fill=shade(wall, 0.62))
        p.rect(dx, y + h - dh, dx + dw, y + h - 1, fill=(58, 58, 68))
        if arch_door:
            p.ellipse(dx + dw / 2, y + h - dh, dw / 2, dw / 2.4, fill=(58, 58, 68))
        p.rect(dx + dw / 2 - 1, y + h - dh, dx + dw / 2, y + h - 1, fill=(74, 74, 86))
    # windows
    if windows and w > 50:
        step = w / (windows + 1)
        for i in range(windows):
            wx = x + step * (i + 1) - 6
            if door and abs((wx + 6) - (x + w / 2)) < 16:
                continue
            wy = y + rh + 4
            p.rect(wx - 2, wy - 2, wx + 12, wy + 17, fill=shade(wall, 0.66))
            p.rect(wx, wy, wx + 10, wy + 14, fill=(122, 146, 164))
            p.line([(wx + 5, wy), (wx + 5, wy + 14)], shade(wall, 0.66), 1)
            p.line([(wx, wy + 7), (wx + 10, wy + 7)], shade(wall, 0.66), 1)
            p.rect(wx - 3, wy + 15, wx + 13, wy + 18, fill=shade(wall, 1.1))
    # roof, tile row by tile row
    inset = min(16.0, w * 0.13)
    rows = max(3, int(rh / 6))
    for k in range(rows):
        t0, t1 = k / rows, (k + 1) / rows
        ya, yb = y + rh * t0, y + rh * t1
        xa = x + inset * (1 - t0) - 6 * t0
        xb = x + w - inset * (1 - t0) + 6 * t0
        xc = x + inset * (1 - t1) - 6 * t1
        xd = x + w - inset * (1 - t1) + 6 * t1
        tone = 1.16 - 0.34 * t0 - (0.05 if k % 2 else 0)
        p.poly([(xa, ya), (xb, ya), (xd, yb), (xc, yb)], fill=shade(roof, tone))
        p.line([(xc, yb), (xd, yb)], shade(roof, tone * 0.66), 0.8)
        n = max(2, int((xd - xc) / 9))
        for j in range(1, n):
            tx = xc + (xd - xc) * j / n + (4 if k % 2 else 0)
            p.line([(tx, ya + 1), (tx, yb)], shade(roof, tone * 0.78), 0.6)
    p.line([(x + inset, y + 1), (x + w - inset, y + 1)], shade(roof, 1.3), 1.4)  # ridge light
    p.rect(x - 6, y + rh - 1, x + w + 6, y + rh + 3, fill=shade(roof, 0.55))  # eave
    p.rect(x - 6, y + rh + 3, x + w + 6, y + rh + 8, fill=(0, 0, 0, 46))  # eave shadow on the wall
    if chimney:
        cx = x + w * 0.72
        p.rect(cx, y - 9, cx + 9, y + rh * 0.5, fill=shade(wall, 0.9))
        p.rect(cx - 1, y - 11, cx + 10, y - 8, fill=shade(wall, 1.1))
    if flag:
        fx = x + w * 0.2
        p.line([(fx, y - 16), (fx, y + 6)], (86, 84, 90), 1.4)
        p.poly([(fx, y - 16), (fx + 14, y - 12), (fx, y - 6)], fill=(150, 150, 160))
    if moss:
        for _ in range(int(w * moss / 8)):
            mx = x + rng.uniform(0, w)
            my = y + h - rng.uniform(0, 12)
            p.ellipse(mx, my, rng.uniform(3, 8), rng.uniform(2, 4), fill=MOSS + (110,))


def town_hall(p, x, y, w, h, roof):
    house(p, x, y, w, h, roof, wall=shade(WALL, 1.04), door=True, windows=3, chimney=True, flag=True)
    # arched windows band
    p.rect(x + 10, y + h * 0.54 + 2, x + w - 10, y + h * 0.54 + 5, fill=shade(WALL, 1.16))


def tower(p, x, y, w, h, roof, clock=False):
    body_top = y + h * 0.36
    p.rect(x, body_top, x + w, y + h, fill=shade(WALL, 1.02))
    for yy in range(int(body_top), int(y + h), 8):
        p.line([(x, yy), (x + w, yy)], shade(WALL, 0.84), 0.8)
    p.rect(x, body_top, x + 4, y + h, fill=shade(WALL, 1.14))
    p.rect(x + w - 5, body_top, x + w, y + h, fill=shade(WALL, 0.74))
    # belfry
    p.rect(x + 6, body_top - 24, x + w - 6, body_top + 2, fill=shade(WALL, 0.96))
    p.rect(x + w / 2 - 6, body_top - 20, x + w / 2 + 6, body_top - 2, fill=(58, 58, 68))
    p.ellipse(x + w / 2, body_top - 20, 6, 5, fill=(58, 58, 68))
    # spire roof
    p.poly([(x - 4, body_top - 22), (x + w + 4, body_top - 22), (x + w / 2, y)], fill=shade(roof, 0.9))
    p.poly([(x + w / 2, y), (x + w + 4, body_top - 22), (x + w / 2 + 2, body_top - 22)], fill=shade(roof, 0.66))
    p.line([(x + w / 2, y), (x + w / 2, y - 14)], (90, 90, 100), 1.4)
    if clock:
        p.ellipse(x + w / 2, body_top + 22, 13, 13, fill=(214, 212, 206), outline=(70, 70, 78), w=1.6)
        p.line([(x + w / 2, body_top + 22), (x + w / 2, body_top + 13)], (60, 60, 70), 1.4)
        p.line([(x + w / 2, body_top + 22), (x + w / 2 + 8, body_top + 26)], (60, 60, 70), 1.4)
    p.rect(x, y + h - 6, x + w, y + h, fill=shade(WALL, 0.7))


# ---- props ---------------------------------------------------------------------------------------------------------------
def lamp(p, x, y_feet, glow=True):
    if glow:
        for r, a in ((26, 16), (17, 26), (10, 42)):
            p.ellipse(x, y_feet - 46, r, r, fill=(255, 222, 150, a))
    p.ellipse(x, y_feet - 1, 6, 3, fill=(0, 0, 0, 70))
    p.rect(x - 4, y_feet - 6, x + 4, y_feet, fill=(92, 92, 102))
    p.rect(x - 1.6, y_feet - 44, x + 1.6, y_feet - 6, fill=(74, 74, 84))
    p.rect(x - 7, y_feet - 58, x + 7, y_feet - 44, fill=(64, 64, 74))
    p.rect(x - 5, y_feet - 56, x + 5, y_feet - 46, fill=(252, 226, 156))
    p.poly([(x - 9, y_feet - 58), (x + 9, y_feet - 58), (x, y_feet - 67)], fill=(70, 70, 82))


def planter(p, x0, y0, x1, y1, rng, bush=True):
    p.rect(x0, y0 + (y1 - y0) * 0.45, x1, y1, fill=(150, 149, 153), r=2)
    p.rect(x0, y0 + (y1 - y0) * 0.45, x1, y0 + (y1 - y0) * 0.55, fill=(184, 183, 187))
    p.rect(x0, y1 - 5, x1, y1, fill=(112, 112, 120))
    if bush:
        n = max(3, int((x1 - x0) / 9))
        for i in range(n):
            cx = x0 + (x1 - x0) * (i + 0.5) / n + rng.uniform(-2, 2)
            cy = y0 + (y1 - y0) * 0.42 + rng.uniform(-4, 2)
            r = rng.uniform(8, 12)
            col = mix((70, 96, 70), (108, 132, 96), rng.random())
            p.ellipse(cx, cy, r, r * 0.86, fill=col)
            p.ellipse(cx - 2, cy - 3, r * 0.55, r * 0.45, fill=shade(col, 1.25))


def barrel(p, cx, cy, r=9):
    p.ellipse(cx, cy + r * 0.75, r, r * 0.38, fill=(0, 0, 0, 60))
    p.rect(cx - r, cy - r, cx + r, cy + r * 0.7, fill=(132, 122, 116), r=3)
    p.rect(cx - r, cy - r * 0.55, cx + r, cy - r * 0.35, fill=(96, 92, 96))
    p.rect(cx - r, cy + r * 0.1, cx + r, cy + r * 0.3, fill=(96, 92, 96))
    p.ellipse(cx, cy - r, r, r * 0.42, fill=(150, 142, 138))


def crate(p, x, y, w, h):
    p.rect(x, y, x + w, y + h, fill=(138, 128, 118))
    p.rect(x, y, x + w, y + 4, fill=(164, 154, 144))
    p.line([(x, y), (x + w, y + h)], (100, 92, 86), 1)
    p.line([(x + w, y), (x, y + h)], (100, 92, 86), 1)
    p.rect(x, y, x + w, y + h, outline=(96, 88, 84), w=1)


def bread(p, cx, cy, r=6):
    p.ellipse(cx, cy, r, r * 0.6, fill=(176, 170, 162))
    p.ellipse(cx - r * 0.2, cy - r * 0.2, r * 0.6, r * 0.32, fill=(200, 194, 186))
    for k in (-0.4, 0.05, 0.5):
        p.line([(cx + r * k - 1.4, cy - r * 0.35), (cx + r * k + 1.4, cy + r * 0.3)], (128, 124, 120), 0.8)


def bakery_stall(p):
    # counter body, loaves and the striped awning; the baker statue is pasted in between (see paint_statues)
    x0, y0, x1, y1 = BLOCK_RECTS["bakery_counter"]
    p.rect(x0, y0 + 6, x1, y1, fill=(126, 116, 108))
    p.rect(x0, y0 + 6, x1, y0 + 10, fill=(160, 150, 140))
    for i in range(int((x1 - x0) / 14)):
        p.line([(x0 + 7 + i * 14, y0 + 12), (x0 + 7 + i * 14, y1 - 2)], (98, 90, 86), 0.8)
    p.rect(x0, y1 - 4, x1, y1, fill=(88, 82, 82))


def bakery_front(p):
    """Awning + counter top + loaves, drawn after the baker so the counter hides his legs."""
    x0, y0, x1, y1 = BLOCK_RECTS["bakery_counter"]
    p.rect(x0 - 4, y0 + 6, x1 + 4, y0 + 15, fill=(138, 128, 120))
    p.rect(x0 - 4, y0 + 6, x1 + 4, y0 + 9, fill=(174, 164, 154))
    for i, cx in enumerate(range(int(x0) + 8, int(x1) - 6, 17)):
        bread(p, cx, y0 + 7, 6 if i % 2 else 5)
    p.rect(x0, y0 + 15, x1, y1, fill=(126, 116, 108))
    p.rect(x0, y1 - 5, x1, y1, fill=(88, 82, 82))
    for i in range(int((x1 - x0) / 14)):
        p.line([(x0 + 7 + i * 14, y0 + 17), (x0 + 7 + i * 14, y1 - 5)], (98, 90, 86), 0.8)
    # awning above the counter
    ay = y0 - 46
    stripes = int((x1 - x0 + 12) / 12)
    for i in range(stripes):
        ax = x0 - 6 + i * 12
        col = (198, 196, 198) if i % 2 == 0 else (142, 142, 152)
        p.poly([(ax, ay), (ax + 12, ay), (ax + 14, ay + 16), (ax + 2, ay + 16)], fill=col)
        p.ellipse(ax + 8, ay + 16, 6, 3, fill=col)
    p.rect(x0 - 6, ay - 3, x1 + 6, ay, fill=(96, 90, 92))
    # hanging bread sign
    p.line([(x0 - 24, y0 - 78), (x0 + 6, y0 - 78)], (70, 70, 82), 1.6)
    p.rect(x0 - 22, y0 - 76, x0 + 4, y0 - 56, fill=(150, 148, 154), r=2)
    bread(p, x0 - 9, y0 - 66, 8)


def merchant_stall(p):
    x0, y0, x1, y1 = BLOCK_RECTS["merchant_counter"]
    p.rect(x0, y0 + 6, x1, y1, fill=(126, 118, 112))
    p.rect(x0, y0 + 6, x1, y0 + 10, fill=(160, 152, 144))
    for i in range(int((x1 - x0) / 14)):
        p.line([(x0 + 7 + i * 14, y0 + 12), (x0 + 7 + i * 14, y1 - 2)], (98, 92, 88), 0.8)
    p.rect(x0, y1 - 4, x1, y1, fill=(88, 84, 84))


def merchant_front(p):
    x0, y0, x1, y1 = BLOCK_RECTS["merchant_counter"]
    p.rect(x0 - 4, y0 + 8, x1 + 4, y0 + 17, fill=(138, 130, 124))
    p.rect(x0 - 4, y0 + 8, x1 + 4, y0 + 11, fill=(174, 166, 158))
    rng = random.Random(7)
    for cx in range(int(x0) + 8, int(x1) - 4, 13):
        kind = rng.choice(("pot", "fruit", "jar"))
        if kind == "pot":
            p.ellipse(cx, y0 + 4, 6, 6, fill=(150, 142, 138))
            p.rect(cx - 3, y0 - 3, cx + 3, y0 + 0, fill=(172, 164, 158))
        elif kind == "jar":
            p.rect(cx - 4, y0 - 6, cx + 4, y0 + 8, fill=(146, 140, 140), r=2)
            p.rect(cx - 3, y0 - 8, cx + 3, y0 - 5, fill=(170, 164, 164))
        else:
            for dx, dy in ((-3, 3), (3, 3), (0, -1)):
                p.ellipse(cx + dx, y0 + 4 + dy, 3.6, 3.6, fill=(176, 168, 158))
    p.rect(x0, y0 + 17, x1, y1, fill=(126, 118, 112))
    p.rect(x0, y1 - 5, x1, y1, fill=(88, 84, 84))
    ay = y0 - 30
    stripes = int((x1 - x0 + 12) / 12)
    for i in range(stripes):
        ax = x0 - 6 + i * 12
        col = (188, 186, 190) if i % 2 == 0 else (128, 132, 146)
        p.poly([(ax, ay), (ax + 12, ay), (ax + 14, ay + 18), (ax + 2, ay + 18)], fill=col)
        p.ellipse(ax + 8, ay + 18, 6, 3, fill=col)
    p.rect(x0 - 6, ay - 3, x1 + 6, ay, fill=(92, 88, 92))
    p.rect(x0 - 6, ay, x0 - 3, y1, fill=(104, 96, 90))
    p.rect(x1 + 3, ay, x1 + 6, y1, fill=(104, 96, 90))


def draw_well(p):
    x0, y0, x1, y1 = BLOCK_RECTS["well"]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 + 6
    p.ellipse(cx, cy + 5, 34, 16, fill=(0, 0, 0, 60))
    for k in (3, 2, 1):  # stepped base
        p.ellipse(cx, cy + 2 + k * 2, 26 + k * 4, 13 + k * 1.6, fill=shade((156, 155, 160), 0.86 + 0.06 * k))
    p.rect(cx - 27, cy - 10, cx + 27, cy + 8, fill=(158, 157, 162))
    p.ellipse(cx, cy + 8, 27, 12, fill=(150, 149, 154))
    p.ellipse(cx, cy - 10, 27, 12, fill=(190, 189, 194))
    p.ellipse(cx, cy - 10, 20, 8.5, fill=(34, 42, 56))
    p.ellipse(cx, cy - 9, 15, 5.5, fill=(58, 82, 104))
    for i in range(6):
        ax = cx - 25 + i * 10
        p.line([(ax, cy - 2), (ax + 4, cy + 9)], (128, 128, 136), 0.8)
    # frame
    p.rect(cx - 27, cy - 52, cx - 23, cy - 8, fill=(116, 108, 102))
    p.rect(cx + 23, cy - 52, cx + 27, cy - 8, fill=(116, 108, 102))
    p.rect(cx - 30, cy - 56, cx + 30, cy - 50, fill=(132, 124, 118))
    p.poly([(cx - 34, cy - 50), (cx + 34, cy - 50), (cx + 26, cy - 62), (cx - 26, cy - 62)], fill=(112, 116, 132))
    p.line([(cx, cy - 50), (cx, cy - 22)], (96, 90, 84), 1.2)
    p.rect(cx - 5, cy - 24, cx + 5, cy - 14, fill=(126, 116, 108), r=1)


def paint_stairs(p, x0, y0, x1, y1, step=8):
    y = y0
    n = 0
    while y < y1:
        yb = min(y + step, y1)
        tone = 1.06 - 0.02 * (n % 2)
        p.rect(x0, y, x1, yb, fill=shade((176, 175, 179), tone))
        p.rect(x0, yb - 3, x1, yb, fill=(112, 112, 122))
        p.line([(x0, y + 1), (x1, y + 1)], (204, 203, 206), 1)
        for j in range(int((x1 - x0) / 46)):
            p.line([(x0 + 46 * (j + 1), y + 1), (x0 + 46 * (j + 1), yb - 3)], (140, 140, 148), 0.7)
        y += step
        n += 1


def balustrade(p, x0, y0, x1, y1, horizontal=True):
    if horizontal:
        p.rect(x0, y0 + 2, x1, y1 - 2, fill=(156, 155, 160))
        p.rect(x0, y0, x1, y0 + 4, fill=(196, 195, 199))
        p.rect(x0, y1 - 4, x1, y1, fill=(176, 175, 179))
        x = x0 + 4
        while x < x1 - 4:
            p.rect(x, y0 + 4, x + 3, y1 - 4, fill=(128, 128, 136))
            x += 8
    else:
        p.rect(x0 + 2, y0, x1 - 2, y1, fill=(156, 155, 160))
        p.rect(x0, y0, x0 + 4, y1, fill=(196, 195, 199))
        p.rect(x1 - 4, y0, x1, y1, fill=(126, 126, 134))
        y = y0 + 4
        while y < y1 - 4:
            p.rect(x0 + 4, y, x1 - 4, y + 3, fill=(128, 128, 136))
            y += 8


# ---- water --------------------------------------------------------------------------------------------------------------
def paint_canal(p, rng):
    x0, x1, y0, y1 = 1112, 1224, 96, H
    # stone banks
    p.rect(x0 - 10, y0 - 8, x0, y1, fill=(176, 175, 179))
    p.rect(x1, y0 - 8, x1 + 10, y1, fill=(176, 175, 179))
    p.rect(x0 - 10, y0 - 8, x0 - 7, y1, fill=(206, 205, 208))
    p.rect(x1 + 7, y0 - 8, x1 + 10, y1, fill=(150, 150, 158))
    for y in range(y0, y1, 14):
        p.line([(x0 - 10, y), (x0, y)], (126, 126, 136), 0.6)
        p.line([(x1, y + 7), (x1 + 10, y + 7)], (126, 126, 136), 0.6)
    for yy in range(y0, y1, 6):
        t = (yy - y0) / (y1 - y0)
        col = mix((118, 156, 176), (74, 110, 134), t)
        p.rect(x0, yy, x1, yy + 6, fill=col)
    for _ in range(170):
        rx = rng.uniform(x0 + 4, x1 - 24)
        ry = rng.uniform(y0 + 6, y1 - 4)
        ln = rng.uniform(8, 22)
        p.line([(rx, ry), (rx + ln, ry + rng.uniform(-0.6, 0.6))], (196, 222, 232, 150), 0.9)
    for _ in range(60):
        rx = rng.uniform(x0 + 4, x1 - 24)
        ry = rng.uniform(y0 + 6, y1 - 4)
        p.line([(rx, ry), (rx + rng.uniform(6, 14), ry)], (58, 92, 116, 130), 0.9)


def paint_waterfall(p, x0, x1, y0, y1, rng):
    for x in range(int(x0), int(x1), 3):
        ln = rng.uniform(0.6, 1.0)
        col = mix((186, 214, 226), (244, 250, 252), rng.random())
        p.rect(x, y0, x + 2.4, y0 + (y1 - y0) * ln, fill=col + (230,))
    p.ellipse((x0 + x1) / 2, y1 + 1, (x1 - x0) / 2 + 6, 8, fill=(226, 240, 246, 200))
    for _ in range(14):
        p.ellipse(rng.uniform(x0 - 4, x1 + 4), y1 + rng.uniform(-5, 6), rng.uniform(3, 7), rng.uniform(2, 4), fill=(246, 252, 255, 170))


def paint_bridge(p):
    bx0, by0, bx1, by1 = WALK["bridge"]
    # arch face south of the deck (over water)
    p.rect(bx0 + 8, by1, bx1 - 8, by1 + 22, fill=(166, 165, 169))
    p.rect(bx0 + 8, by1, bx1 - 8, by1 + 3, fill=(196, 195, 199))
    p.ellipse((bx0 + bx1) / 2 - 14, by1 + 22, 26, 20, fill=(38, 58, 76))
    p.ellipse((bx0 + bx1) / 2 - 14, by1 + 22, 22, 16, fill=(64, 100, 124))
    p.rect(bx0 + 8, by1 + 22, bx1 - 8, by1 + 26, fill=(118, 156, 176))
    # deck (cobbles get pasted separately); parapets north and south
    p.rect(bx0 + 2, by0 - 10, bx1 - 2, by0 + 2, fill=(174, 173, 177))
    p.rect(bx0 + 2, by0 - 10, bx1 - 2, by0 - 6, fill=(204, 203, 207))
    p.rect(bx0 + 2, by1 - 2, bx1 - 2, by1 + 8, fill=(174, 173, 177))
    p.rect(bx0 + 2, by1 + 4, bx1 - 2, by1 + 8, fill=(120, 120, 130))
    for x in range(int(bx0) + 6, int(bx1) - 4, 12):
        p.rect(x, by0 - 6, x + 6, by0 + 2, fill=(146, 146, 154))
        p.rect(x, by1 - 2, x + 6, by1 + 6, fill=(146, 146, 154))
    for x in (bx0 + 4, bx1 - 10):
        p.rect(x, by0 - 16, x + 8, by0 + 4, fill=(190, 189, 193), r=1)
        p.rect(x, by1 - 2, x + 8, by1 + 10, fill=(190, 189, 193), r=1)


# ---- fountain + the big statue ------------------------------------------------------------------------------------------
def paint_fountain(p, rng):
    cx, cy = FOUNTAIN
    # outer step
    p.ellipse(cx, cy + 8, 212, 100, fill=(0, 0, 0, 44))
    p.ellipse(cx, cy + 4, 204, 94, fill=(196, 195, 199))
    p.ellipse(cx, cy + 12, 204, 92, fill=(140, 140, 148))
    p.ellipse(cx, cy + 2, 204, 92, fill=(190, 189, 193))
    for k in range(16):
        a = math.radians(200 + k * 8.5)
        p.line([(cx + 190 * math.cos(a), cy + 2 + 86 * math.sin(a)), (cx + 204 * math.cos(a), cy + 2 + 92 * math.sin(a))], (146, 146, 154), 0.8)
    # basin wall + rim
    p.ellipse(cx, cy + 8, 186, 84, fill=(132, 132, 142))
    p.ellipse(cx, cy - 2, 186, 84, fill=(206, 205, 209))
    p.ellipse(cx, cy - 2, 172, 74, fill=(150, 150, 158))
    # water
    p.ellipse(cx, cy, 168, 70, fill=(88, 128, 150))
    p.ellipse(cx, cy + 4, 150, 56, fill=(104, 146, 168))
    for _ in range(90):
        ang = rng.uniform(0, 2 * math.pi)
        rr = rng.uniform(0.15, 0.9)
        rx = cx + math.cos(ang) * 150 * rr
        ry = cy + 4 + math.sin(ang) * 54 * rr
        p.line([(rx, ry), (rx + rng.uniform(6, 16), ry)], (206, 230, 238, 170), 0.9)
    # ring of small stone animals on the rim (front side)
    for a_deg in (25, 70, 110, 155):
        a = math.radians(a_deg)
        ax, ay = cx + 172 * math.cos(a), cy - 2 + 74 * math.sin(a)
        p.ellipse(ax, ay + 2, 10, 4, fill=(0, 0, 0, 60))
        p.ellipse(ax, ay - 6, 9, 6, fill=(184, 183, 187))
        p.ellipse(ax + 6, ay - 12, 4.5, 4, fill=(190, 189, 193))
        p.poly([(ax + 8, ay - 15), (ax + 11, ay - 20), (ax + 12, ay - 14)], fill=(176, 175, 179))
        for dx in (-6, -2, 3, 7):
            p.rect(ax + dx, ay - 3, ax + dx + 2, ay + 4, fill=(160, 160, 166))
    # pedestal
    p.ellipse(cx, cy - 6, 62, 26, fill=(0, 0, 0, 58))
    p.rect(cx - 46, cy - 30, cx + 46, cy - 6, fill=(170, 169, 173))
    p.ellipse(cx, cy - 6, 46, 15, fill=(158, 157, 162))
    p.ellipse(cx, cy - 30, 46, 15, fill=(206, 205, 209))
    p.rect(cx - 34, cy - 60, cx + 34, cy - 30, fill=(184, 183, 187))
    p.ellipse(cx, cy - 30, 34, 10, fill=(160, 160, 166))
    p.ellipse(cx, cy - 60, 34, 10, fill=(210, 209, 213))
    for x in range(-30, 32, 12):
        p.line([(cx + x, cy - 58), (cx + x, cy - 32)], (146, 146, 154), 1)
    paint_giant_statue(p, cx, cy - 60)


# The plaza statue is drawn at full size on a transparent layer and shrunk, so its raised star stays clear of the
# fallen wall at the foot of the north stairs (objects.json `barrier_north_stairs`). STAR_ANCHOR is where the star ends up
# (native px); objects.json `statue_plaza_star.glow` must match it (checked by verify_star_anchor).
GIANT_STATUE_SCALE = 0.82
GIANT_STATUE_FEET = (FOUNTAIN[0], FOUNTAIN[1] - 60)
STAR_ANCHOR = (GIANT_STATUE_FEET[0] + 39 * GIANT_STATUE_SCALE, GIANT_STATUE_FEET[1] - 192 * GIANT_STATUE_SCALE)


def paint_giant_statue(p, cx, fy):
    lw, lh, lcx, lfy = 260, 250, 130, 232
    layer = Image.new("RGBA", (lw * SS, lh * SS), (0, 0, 0, 0))
    draw_giant_statue(Painter(layer), lcx, lfy)
    k = GIANT_STATUE_SCALE
    layer = layer.resize((int(lw * SS * k), int(lh * SS * k)), Image.LANCZOS)
    p.im.paste(layer, (int(s(cx) - lcx * SS * k), int(s(fy) - lfy * SS * k)), layer)


def verify_star_anchor(objects):
    glow = next(o for o in objects if o["type"] == "awakening")["glow"]
    if abs(glow["x"] - STAR_ANCHOR[0]) > 2 or abs(glow["y"] - STAR_ANCHOR[1]) > 2:
        raise SystemExit(f"objects.json statue_plaza_star.glow must be {{x: {round(STAR_ANCHOR[0])}, y: {round(STAR_ANCHOR[1])}}}, got {glow}")


def draw_giant_statue(p, cx, fy):
    """Winged figure raising a star. (cx, fy) = feet on the pedestal top. Height ~190px."""
    light, mid, dark, deep = (216, 215, 219), (184, 183, 188), (148, 148, 156), (112, 112, 122)
    # wings (behind)
    for side, sx in ((-1, -1), (1, 1)):
        base = (cx + sx * 12, fy - 112)
        tip_out = (cx + sx * 104, fy - 168 + (10 if side < 0 else 0))
        tip_low = (cx + sx * 84, fy - 96)
        p.poly([base, (cx + sx * 40, fy - 156), tip_out, (cx + sx * 96, fy - 132), tip_low, (cx + sx * 34, fy - 92)], fill=mid if side < 0 else light)
        for k in range(7):
            t = k / 6
            ex = base[0] + (tip_out[0] - base[0]) * (0.25 + 0.75 * t)
            ey = base[1] + (tip_out[1] - base[1]) * (0.25 + 0.75 * t)
            lx = base[0] + (tip_low[0] - base[0]) * (0.25 + 0.75 * t)
            ly = base[1] + (tip_low[1] - base[1]) * (0.25 + 0.75 * t)
            p.line([(ex, ey), (lx, ly)], deep, 0.9)
    # ribbon streamers
    ribbon = (200, 199, 203)
    pts = [(cx + 26, fy - 150), (cx + 62, fy - 118), (cx + 70, fy - 78), (cx + 50, fy - 40), (cx + 22, fy - 18)]
    p.line(pts, ribbon, 4.5)
    p.line([(x - 2, y - 2) for x, y in pts], (238, 238, 242), 1.2)
    pts2 = [(cx - 18, fy - 100), (cx - 64, fy - 70), (cx - 80, fy - 34), (cx - 60, fy - 12)]
    p.line(pts2, ribbon, 4)
    # robe
    p.poly([(cx - 20, fy - 96), (cx + 20, fy - 96), (cx + 40, fy - 6), (cx + 12, fy - 2), (cx - 12, fy - 3), (cx - 42, fy - 6)], fill=mid)
    p.poly([(cx - 20, fy - 96), (cx - 4, fy - 96), (cx - 8, fy - 3), (cx - 42, fy - 6)], fill=light)
    for k, dx in enumerate((-30, -18, -7, 6, 18, 30)):
        p.line([(cx + dx * 0.35, fy - 92), (cx + dx, fy - 6)], dark, 1.2)
    p.poly([(cx + 20, fy - 96), (cx + 8, fy - 96), (cx + 14, fy - 3), (cx + 40, fy - 6)], fill=dark)
    # waist sash + torso
    p.rect(cx - 15, fy - 100, cx + 17, fy - 94, fill=dark)
    p.rect(cx - 14, fy - 130, cx + 15, fy - 100, fill=light, r=6)
    p.rect(cx + 6, fy - 130, cx + 15, fy - 100, fill=mid, r=4)
    # lowered arm holding a fold of cloth
    p.line([(cx - 12, fy - 122), (cx - 26, fy - 100), (cx - 30, fy - 84)], mid, 6)
    p.ellipse(cx - 30, fy - 82, 5, 5, fill=light)
    # raised arm to the star
    p.line([(cx + 12, fy - 124), (cx + 30, fy - 152), (cx + 38, fy - 176)], mid, 6)
    p.line([(cx + 10, fy - 125), (cx + 28, fy - 152), (cx + 36, fy - 175)], light, 1.6)
    p.ellipse(cx + 39, fy - 178, 5, 5, fill=light)
    # head + hair
    p.ellipse(cx - 1, fy - 142, 11.5, 12, fill=light)
    p.poly([(cx - 13, fy - 142), (cx - 9, fy - 158), (cx + 10, fy - 156), (cx + 12, fy - 138), (cx + 16, fy - 120), (cx + 8, fy - 128), (cx - 14, fy - 128)], fill=mid)
    p.ellipse(cx - 4, fy - 142, 4, 5, fill=light)
    # the star (dull stone; the runtime layer makes it glow)
    star_c = (cx + 39, fy - 192)
    pts = []
    for i in range(16):
        r = 16 if i % 2 == 0 else 6
        a = math.radians(-90 + i * 22.5)
        pts.append((star_c[0] + r * math.cos(a), star_c[1] + r * math.sin(a)))
    p.poly(pts, fill=(226, 222, 206), outline=(150, 148, 140))
    p.ellipse(star_c[0], star_c[1], 4, 4, fill=(246, 242, 226))


# ---- statues -------------------------------------------------------------------------------------------------------------
ROW_ORDER = ["down", "left", "right", "up"]


def stonify(frame, rng, moss=False):
    arr = np.asarray(frame.convert("RGBA")).astype(np.float32)
    rgb, a = arr[..., :3], arr[..., 3]
    lum = 0.30 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]
    on = a > 20
    lo, hi = np.percentile(lum[on], 4), np.percentile(lum[on], 97)
    t = np.clip((lum - lo) / max(hi - lo, 1.0), 0, 1) ** 0.88
    dark, light = np.array([74, 78, 94], np.float32), np.array([236, 236, 238], np.float32)
    out = dark + (light - dark) * t[..., None]
    out += rng.normal(0, 4.2, size=out.shape[:2])[..., None]
    if moss:
        yy = np.linspace(0, 1, arr.shape[0])[:, None]
        m = np.clip((yy - 0.62) * 2.6, 0, 1) * (rng.random(arr.shape[:2]) > 0.62)
        out = out * (1 - 0.5 * m[..., None]) + np.array([92, 122, 84], np.float32) * 0.5 * m[..., None]
    res = np.dstack([np.clip(out, 0, 255), a]).astype(np.uint8)
    return Image.fromarray(res, "RGBA")


def sprite_frame(sheet_id, facing, frame, rng, moss=False):
    sheet = Image.open(NPC_DIR / f"villager_{sheet_id}_walk.png").convert("RGBA")
    row = ROW_ORDER.index(facing)
    return stonify(sheet.crop((frame * 70, row * 70, frame * 70 + 70, row * 70 + 70)), rng, moss)


def paste_person(p, spec, ax, ay, rng):
    """Paste a stone-tinted villager frame so its feet (frame baseline y=67) land on (ax, ay)."""
    frame = sprite_frame(spec["sheet"], spec.get("facing", "down"), spec.get("frame", 0), rng, spec.get("moss", False))
    sc = spec.get("scale", 1.0)
    k = SS / 1.5 * sc
    size = (int(70 * k), int(70 * k))
    frame = frame.resize(size, Image.LANCZOS)
    # low stone plinth + contact shadow so the statue reads against the paving
    if not spec.get("no_plinth"):
        p.ellipse(ax, ay + 1, 15 * sc, 5.2 * sc, fill=(0, 0, 0, 70))
        p.ellipse(ax, ay - 1, 13.5 * sc, 4.8 * sc, fill=(120, 120, 130))
        p.ellipse(ax, ay - 2.4, 13.5 * sc, 4.4 * sc, fill=(204, 204, 208))
    pos = (int(s(ax) - 35 * k), int(s(ay) - 67 * k))
    alpha = frame.getchannel("A")
    halo_mask = alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1)).point(lambda v: int(v * 0.55))
    halo = Image.new("RGB", size, (232, 232, 240))
    p.im.paste(halo, pos, halo_mask)
    p.im.paste(frame, pos, frame)


def stone_col(shade_f=1.0):
    return shade((172, 171, 176), shade_f)


def draw_dog(p, cx, by, facing="left", scale=1.0, run=True):
    f = -1 if facing == "left" else 1
    S = scale
    col, hi, lo = stone_col(1.0), stone_col(1.18), stone_col(0.72)
    p.ellipse(cx, by + 1, 22 * S, 4, fill=(0, 0, 0, 70))
    def X(dx): return cx + f * dx * S
    def Y(dy): return by + dy * S
    # legs (galloping: front reaching forward, hind pushing back)
    p.poly([(X(9), Y(-12)), (X(21), Y(-9)), (X(23), Y(-6)), (X(10), Y(-8))], fill=lo)
    p.poly([(X(5), Y(-12)), (X(15), Y(-3)), (X(17), Y(0)), (X(4), Y(-7))], fill=col)
    p.poly([(X(-9), Y(-12)), (X(-20), Y(-8)), (X(-23), Y(-5)), (X(-8), Y(-7))], fill=lo)
    p.poly([(X(-6), Y(-12)), (X(-14), Y(-2)), (X(-16), Y(0)), (X(-4), Y(-6))], fill=col)
    p.ellipse(X(0), Y(-16), 15 * S, 7.2 * S, fill=col)
    p.ellipse(X(-2), Y(-19), 11 * S, 3.4 * S, fill=hi)
    p.poly([(X(-13), Y(-20)), (X(-22), Y(-30)), (X(-24), Y(-25)), (X(-16), Y(-17))], fill=col)  # tail up
    p.ellipse(X(14), Y(-22), 7 * S, 6 * S, fill=col)  # head
    p.ellipse(X(20), Y(-20), 5 * S, 3.4 * S, fill=hi)  # snout
    p.poly([(X(12), Y(-26)), (X(9), Y(-33)), (X(15), Y(-28))], fill=lo)  # ear
    p.ellipse(X(17), Y(-23), 1.3 * S, 1.3 * S, fill=(60, 60, 70))
    p.ellipse(X(24), Y(-20), 1.4 * S, 1.2 * S, fill=(60, 60, 70))


def draw_cat(p, cx, by, scale=1.0):
    S = scale
    col, hi, lo = stone_col(1.0), stone_col(1.18), stone_col(0.72)
    p.ellipse(cx, by + 1, 14 * S, 3.4, fill=(0, 0, 0, 70))
    p.ellipse(cx, by - 8 * S, 10 * S, 8.5 * S, fill=col)
    p.ellipse(cx - 2 * S, by - 12 * S, 6 * S, 4.5 * S, fill=hi)
    p.ellipse(cx + 3 * S, by - 19 * S, 5.6 * S, 5 * S, fill=col)
    p.poly([(cx, by - 22 * S), (cx - 1 * S, by - 29 * S), (cx + 4 * S, by - 23 * S)], fill=col)
    p.poly([(cx + 4 * S, by - 23 * S), (cx + 8 * S, by - 29 * S), (cx + 9 * S, by - 21 * S)], fill=col)
    p.line([(cx - 9 * S, by - 4 * S), (cx - 17 * S, by - 4 * S), (cx - 19 * S, by - 12 * S), (cx - 14 * S, by - 15 * S)], lo, 3 * S)
    p.ellipse(cx + 4.5 * S, by - 19.5 * S, 1 * S, 1 * S, fill=(60, 60, 70))
    for dx in (-1, 1):
        p.rect(cx + 2 * S + dx * 3 * S, by - 2 * S, cx + 3.4 * S + dx * 3 * S, by + 1, fill=lo)


def draw_pigeon(p, cx, by, facing="right", scale=1.0):
    f = 1 if facing == "right" else -1
    S = scale
    col, hi, lo = stone_col(1.0), stone_col(1.2), stone_col(0.7)
    p.ellipse(cx, by + 1, 8 * S, 2.4, fill=(0, 0, 0, 64))
    p.ellipse(cx, by - 6 * S, 7 * S, 5 * S, fill=col)
    p.poly([(cx - f * 5 * S, by - 6 * S), (cx - f * 13 * S, by - 4 * S), (cx - f * 6 * S, by - 2 * S)], fill=lo)
    p.ellipse(cx + f * 1 * S, by - 7.5 * S, 4.6 * S, 2.6 * S, fill=hi)
    p.ellipse(cx + f * 6 * S, by - 11 * S, 3 * S, 3 * S, fill=col)
    p.poly([(cx + f * 8.6 * S, by - 11 * S), (cx + f * 12 * S, by - 10 * S), (cx + f * 8.6 * S, by - 9 * S)], fill=(126, 124, 122))
    p.rect(cx - 1 * S, by - 2 * S, cx + 0.2 * S, by + 1, fill=lo)
    p.rect(cx + 2 * S, by - 2 * S, cx + 3.2 * S, by + 1, fill=lo)


# Which villager sheet / pose each statue object uses. Anchors are relative to the object's rect.
def paint_statues(p, objects, rng):
    by_id = {o["id"]: o for o in objects}

    def foot(o, dx=0.5, dy=1.0):
        return o["x"] + o["width"] * dx, o["y"] + o["height"] * dy

    # entrance
    o = by_id["statue_gate_guard"]; x, y = foot(o)
    paste_person(p, dict(sheet="04", facing="down", frame=0), x, y, rng)
    p.line([(x + 14, y - 34), (x + 14, y - 4)], (118, 112, 106), 1.6)  # halberd shaft
    p.poly([(x + 11, y - 34), (x + 14, y - 46), (x + 17, y - 34)], fill=(196, 195, 200))
    o = by_id["statue_gate_traveler"]
    paste_person(p, dict(sheet="06", facing="down", frame=0, moss=True), o["x"] + 20, o["y"] + o["height"] - 2, rng)
    draw_dog(p, o["x"] + o["width"] - 22, o["y"] + o["height"] - 2, facing="left", scale=0.86, run=False)
    # neck
    o = by_id["statue_cat"]; x, y = foot(o); draw_cat(p, x, y - 1)
    o = by_id["statue_pigeons"]
    draw_pigeon(p, o["x"] + 10, o["y"] + o["height"] - 2, "right")
    draw_pigeon(p, o["x"] + 28, o["y"] + o["height"] - 4, "left", 0.9)
    # plaza
    o = by_id["statue_talkers"]
    paste_person(p, dict(sheet="05", facing="right", frame=0), o["x"] + 22, o["y"] + o["height"] - 2, rng)
    paste_person(p, dict(sheet="09", facing="left", frame=0), o["x"] + o["width"] - 22, o["y"] + o["height"] - 2, rng)
    o = by_id["statue_prayer"]; x, y = foot(o)
    paste_person(p, dict(sheet="10", facing="up", frame=0, scale=0.9), x, y, rng)
    o = by_id["statue_well_woman"]; x, y = foot(o)
    wx0, wy0, wx1, wy1 = BLOCK_RECTS["well"]
    paste_person(p, dict(sheet="02", facing="right", frame=1), x, y, rng)
    p.line([(x + 10, y - 26), ((wx0 + wx1) / 2 - 2, wy0 - 30)], (108, 100, 94), 1.2)  # rope to the frame
    # west terrace
    o = by_id["statue_baker"]
    bx = o["x"] + 44
    paste_person(p, dict(sheet="01", facing="right", frame=0, scale=1.04, no_plinth=True), bx, o["y"] + 32, rng)
    p.poly([(bx + 6, o["y"] + 6), (bx + 30, o["y"] + 9), (bx + 30, o["y"] + 14), (bx + 6, o["y"] + 16)], fill=stone_col(0.9))  # outstretched arm
    bread(p, bx + 34, o["y"] + 9, 7)
    o = by_id["statue_child"]; x, y = foot(o)
    paste_person(p, dict(sheet="07", facing="left", frame=1, scale=0.82), x, y, rng)
    for k in range(3):
        p.line([(x + 14 + k * 2, y - 24 + k * 6), (x + 22 + k * 2, y - 24 + k * 6)], (120, 120, 132, 150), 1)
    o = by_id["statue_dog"]; x, y = foot(o); draw_dog(p, x, y - 1, facing="left", scale=1.05)
    o = by_id["statue_basket_woman"]; x, y = foot(o)
    paste_person(p, dict(sheet="13", facing="down", frame=0), x, y, rng)
    p.ellipse(x - 8, y - 18, 9, 5, fill=(140, 130, 120))
    for k in range(3):
        bread(p, x - 11 + k * 5, y - 21, 3.4)
    o = by_id["statue_birds"]
    draw_pigeon(p, o["x"] + 12, o["y"] + o["height"] - 2, "right", 0.9)
    draw_pigeon(p, o["x"] + 28, o["y"] + o["height"] - 3, "left", 0.85)
    # east
    o = by_id["statue_bridge_traveler"]; x, y = foot(o)
    paste_person(p, dict(sheet="16", facing="right", frame=2), x, y, rng)
    o = by_id["statue_merchant"]
    paste_person(p, dict(sheet="03", facing="down", frame=0), o["x"] + 28, o["y"] + 36, rng)
    o = by_id["statue_mother_child"]
    paste_person(p, dict(sheet="02", facing="right", frame=0), o["x"] + 16, o["y"] + o["height"] - 2, rng)
    paste_person(p, dict(sheet="07", facing="right", frame=0, scale=0.72), o["x"] + o["width"] - 14, o["y"] + o["height"] - 2, rng)
    p.line([(o["x"] + 24, o["y"] + o["height"] - 20), (o["x"] + o["width"] - 20, o["y"] + o["height"] - 16)], stone_col(0.8), 1.6)  # held hands
    o = by_id["statue_reader"]; x, y = foot(o)
    paste_person(p, dict(sheet="06", facing="down", frame=0), x, y, rng)
    p.rect(x - 6, y - 24, x + 6, y - 15, fill=stone_col(0.86), r=1)
    p.line([(x, y - 24), (x, y - 15)], stone_col(0.62), 0.9)
    o = by_id["statue_porter"]; x, y = foot(o)
    paste_person(p, dict(sheet="08", facing="left", frame=1), x, y, rng)
    crate(p, x - 24, y - 30, 14, 12)
    # terrace
    o = by_id["statue_elder"]; x, y = foot(o)
    paste_person(p, dict(sheet="17", facing="down", frame=0, moss=True), x, y, rng)


# ---- scenery composition ------------------------------------------------------------------------------------------------
def build_background():
    rng_np = np.random.default_rng(1801)
    rng = random.Random(1801)
    objects = load_objects()
    walk_rects = list(WALK.values())

    im = make_rock(rng_np)
    p = Painter(im)

    # --- filler hillside houses in the blocked corners (drawn first so the ground and landmarks sit on top)
    zones = [(0, 90, 410, 360), (0, 790, 440, 1086), (1110, 110, 1448, 350), (1232, 830, 1448, 1086), (440, 930, 596, 1086), (852, 930, 1010, 1086), (0, 360, 68, 790), (1428, 360, 1448, 830)]
    placed = []

    def overlaps(a, b, gap=6):
        return not (a[2] + gap <= b[0] or b[2] + gap <= a[0] or a[3] + gap <= b[1] or b[3] + gap <= a[1])

    LANDMARK_BOXES = [
        (72, 368, 256, 512), (272, 384, 408, 512), (424, 232, 632, 320), (816, 232, 1032, 320), (1032, 264, 1112, 400),
        (1240, 352, 1424, 480), (232, 776, 440, 912), (1008, 792, 1104, 912), (520, 940, 600, 1086), (848, 940, 928, 1086),
        (520, 8, 584, 80), (864, 8, 928, 80),
    ]
    fill_rng = random.Random(44)
    for zx0, zy0, zx1, zy1 in zones:
        attempts = 0
        while attempts < 260:
            attempts += 1
            w = fill_rng.choice((54, 66, 78, 92, 108))
            h = fill_rng.choice((56, 64, 76, 88))
            if zx1 - zx0 < w + 4 or zy1 - zy0 < h + 4:
                continue
            x = fill_rng.randint(zx0, zx1 - w)
            y = fill_rng.randint(zy0, zy1 - h)
            box = (x, y, x + w, y + h)
            if any(overlaps(box, wr, 10) for wr in walk_rects) or any(overlaps(box, lb, 4) for lb in LANDMARK_BOXES) or any(overlaps(box, pb, 5) for pb in placed):
                continue
            placed.append(box)
    tree_rng = random.Random(77)
    tree_spots = []
    for zx0, zy0, zx1, zy1 in zones:
        for _ in range(60):
            tx, ty = tree_rng.uniform(zx0 + 8, zx1 - 8), tree_rng.uniform(zy0 + 30, zy1 - 4)
            box = (tx - 12, ty - 44, tx + 12, ty + 4)
            if any(overlaps(box, wr, 6) for wr in walk_rects) or any(overlaps(box, lb, 2) for lb in LANDMARK_BOXES) or any(overlaps(box, pb, 1) for pb in placed):
                continue
            if any(abs(tx - ox) < 30 and abs(ty - oy) < 26 for ox, oy in tree_spots):
                continue
            tree_spots.append((tx, ty))
            if len(tree_spots) > 90:
                break
    for tx, ty in sorted(tree_spots, key=lambda q: q[1]):
        cypress(p, tx, ty, tree_rng.uniform(34, 50), tree_rng)
    for box in sorted(placed, key=lambda b: b[3]):
        x0, y0, x1, y1 = box
        r = ROOFS[(x0 // 7 + y0 // 5) % len(ROOFS)]
        house(p, x0, y0, x1 - x0, y1 - y0, r, wall=shade(WALL, fill_rng.uniform(0.9, 1.05)), door=fill_rng.random() < 0.7, windows=fill_rng.choice((1, 2)),
              chimney=fill_rng.random() < 0.4, rng=fill_rng, moss=0.4)

    # --- distant cliffs / waterfalls along the top
    for x0, x1 in ((150, 300), (1120, 1216)):
        p.rect(x0 - 12, 0, x1 + 12, 92, fill=(84, 86, 98))
        paint_waterfall(p, x0, x1, 0, 90, random.Random(x0))
    paint_canal(p, random.Random(9))

    # --- ground: cobbles on the walkable union
    mask = ground_mask_ss()
    cob = make_cobbles((W * SS, H * SS), np_to_py_rng(rng_np))
    paste_masked(im, cob, mask)
    p = Painter(im)

    # plaza: lighter flagstone ring band around the fountain + edge shading
    cx, cy = FOUNTAIN
    for k, (rx, ry, col) in enumerate(((236, 120, (214, 213, 216, 56)), (286, 148, (100, 100, 110, 70)), (336, 176, (214, 213, 216, 50)), (372, 196, (100, 100, 110, 60)))):
        p.ellipse(cx, cy + 10, rx, ry, outline=col, w=3.2 if k % 2 == 0 else 2)
    # subtle tone patches on the paving
    # moss in the joints near walls and along a few cracks
    for _ in range(360):
        zx0, zy0, zx1, zy1 = rng.choice(walk_rects)
        mx, my = rng.uniform(zx0, zx1), rng.uniform(zy0, zy1)
        if mask.getpixel((int(mx * SS), int(my * SS))) == 0:
            continue
        p.ellipse(mx, my, rng.uniform(2, 6), rng.uniform(1.4, 3), fill=MOSS + (rng.randint(40, 90),))
    for _ in range(70):  # cracks in the paving
        zx0, zy0, zx1, zy1 = WALK["plaza"] if rng.random() < 0.6 else rng.choice(walk_rects)
        x = rng.uniform(zx0 + 10, zx1 - 10); y = rng.uniform(zy0 + 10, zy1 - 10)
        pts = [(x, y)]
        for _ in range(rng.randint(3, 5)):
            x += rng.uniform(-9, 9); y += rng.uniform(2, 9); pts.append((x, y))
        p.line(pts, (74, 76, 86, 150), 0.8)

    # --- terrace / stairs / gates (ground level decoration)
    tx0, ty0, tx1, ty1 = WALK["terrace"]
    for x in range(int(tx0), int(tx1), 32):
        p.line([(x, ty0), (x, ty1)], (128, 128, 136, 90), 0.7)
    paint_stairs(p, 648, 216, 800, 328)
    # terrace front wall + balustrades (west/east of the stairs), halls below
    for (x0, x1) in ((536, 640), (808, 912)):
        p.rect(x0, 216, x1, 240, fill=(158, 157, 162))
        p.rect(x0, 216, x1, 221, fill=(206, 205, 209))
        for x in range(int(x0) + 6, int(x1), 12):
            p.line([(x, 221), (x, 240)], (128, 128, 136), 0.8)
        p.rect(x0, 236, x1, 240, fill=(112, 112, 122))
    balustrade(p, 632, 214, 648, 328, horizontal=False)
    balustrade(p, 800, 214, 816, 328, horizontal=False)
    balustrade(p, 536, 72, 552, 208, horizontal=False)
    balustrade(p, 896, 72, 912, 208, horizontal=False)

    # --- landmark buildings (back to front)
    tower(p, 520, 8, 64, 90, (104, 100, 120))
    tower(p, 864, 8, 64, 90, (104, 100, 120))
    # north gate wall + arch (the road stays visible under the lintel)
    for (gx0, gx1) in ((584, 656), (792, 864)):
        p.rect(gx0, 24, gx1, 76, fill=shade(WALL, 1.0))
        for y in range(24, 76, 7):
            p.line([(gx0, y), (gx1, y)], shade(WALL, 0.84), 0.8)
        p.rect(gx0, 24, gx1, 31, fill=shade(WALL, 1.16))
        for x in range(int(gx0), int(gx1) - 10, 22):
            p.rect(x, 18, x + 12, 25, fill=shade(WALL, 1.05))
        p.rect(gx0, 70, gx1, 76, fill=shade(WALL, 0.7))
    p.rect(652, 22, 796, 48, fill=shade(WALL, 1.02))
    p.rect(652, 22, 796, 28, fill=shade(WALL, 1.18))
    p.ellipse(724, 48, 72, 14, fill=shade(WALL, 0.86))
    p.ellipse(724, 50, 66, 8, fill=(50, 50, 62, 50))
    for x in range(660, 792, 14):
        p.line([(x, 28), (x, 44)], shade(WALL, 0.8), 0.7)
    for bx in (664, 782):
        p.line([(bx, 50), (bx, 66)], (86, 84, 90), 1.2)
        p.poly([(bx, 50), (bx + 11, 54), (bx, 60)], fill=(146, 146, 156))

    house(p, 72, 368, 184, 144, ROOFS[3], door=False, windows=1, chimney=True, rng=rng, moss=0.3)  # bakery
    house(p, 272, 384, 136, 128, ROOFS[0], rng=rng, chimney=True, moss=0.4)
    town_hall(p, 424, 232, 208, 88, ROOFS[4])
    town_hall(p, 816, 232, 216, 88, ROOFS[1])
    tower(p, 1032, 264, 80, 136, (104, 100, 120), clock=True)
    house(p, 1240, 352, 184, 128, ROOFS[2], rng=rng, chimney=True, flag=True, moss=0.3)
    house(p, 232, 776, 208, 136, ROOFS[3], rng=rng, chimney=True, moss=0.5)
    house(p, 1008, 792, 96, 120, ROOFS[0], rng=rng, moss=0.4)
    # south gate towers + wall
    for x0 in (520, 848):
        tower(p, x0, 940, 80, 146, (98, 106, 126))
    p.rect(440, 1010, 520, 1086, fill=shade(WALL, 0.98))
    p.rect(928, 1010, 1008, 1086, fill=shade(WALL, 0.98))
    for y in range(1010, 1086, 7):
        p.line([(440, y), (520, y)], shade(WALL, 0.84), 0.8)
        p.line([(928, y), (1008, y)], shade(WALL, 0.84), 0.8)
    p.rect(592, 984, 856, 1010, fill=shade(WALL, 1.02))
    p.rect(592, 984, 856, 989, fill=shade(WALL, 1.18))
    p.ellipse(724, 1010, 132, 22, fill=shade(WALL, 0.94))
    p.ellipse(724, 1012, 124, 10, fill=(58, 58, 70, 52))
    for x in range(600, 848, 14):
        p.line([(x, 989), (x, 1006)], shade(WALL, 0.8), 0.7)
    for bx in (612, 826):
        p.line([(bx, 990), (bx, 1008)], (86, 84, 90), 1.2)
        p.poly([(bx, 990), (bx + 12, 994), (bx, 1000)], fill=(146, 146, 156))

    # shadows of the tall props onto the paving (soft, to the right/below)
    sh = Image.new("L", (W * SS, H * SS), 0)
    sd = ImageDraw.Draw(sh)
    def shadow_rect(x0, y0, x1, y1): sd.rectangle([s(x0 + 8), s(y0 + 6), s(x1 + 14), s(y1 + 10)], fill=70)
    sd.ellipse([s(FOUNTAIN[0] - 190), s(FOUNTAIN[1] - 60), s(FOUNTAIN[0] + 250), s(FOUNTAIN[1] + 120)], fill=64)
    for x0, y0, x1, y1 in LANDMARK_BOXES[:8]:
        shadow_rect(x0, y0, x1, y1)
    sh = sh.filter(ImageFilter.GaussianBlur(s(7)))
    dark = Image.new("RGB", im.size, (30, 34, 52))
    gm = mask.point(lambda v: 255 if v else 0)
    sh_ground = Image.composite(sh, Image.new("L", im.size, 0), gm)
    im.paste(dark, (0, 0), sh_ground.point(lambda v: int(v * 0.55)))
    p = Painter(im)

    # --- props
    for name in ("planter_nw", "planter_ne", "planter_sw", "planter_se", "neck_planter_w", "neck_planter_e"):
        x0, y0, x1, y1 = BLOCK_RECTS[name]
        planter(p, x0, y0 - 6, x1, y1, random.Random(zlib.crc32(name.encode())))
    for name in ("lamp_plaza_nw", "lamp_plaza_ne", "lamp_plaza_sw", "lamp_plaza_se", "lamp_quay_n", "lamp_quay_s", "lamp_terrace_w", "lamp_terrace_e"):
        x0, y0, x1, y1 = BLOCK_RECTS[name]
        lamp(p, (x0 + x1) / 2, y1)
    draw_well(p)
    bakery_stall(p)
    merchant_stall(p)
    for cx_, cy_ in ((112, 626), (130, 614), (140, 634), (120, 644)):
        barrel(p, cx_, cy_, 9)
    for cx_, cy_, w_, h_ in ((108, 728, 26, 24), (134, 730, 24, 22), (120, 708, 26, 22)):
        crate(p, cx_, cy_, w_, h_)
    crate(p, 1376, 740, 26, 24); crate(p, 1396, 728, 24, 22); barrel(p, 1388, 776, 8)
    paint_bridge(p)
    paint_fountain(p, random.Random(5))

    # --- petrified townspeople and animals
    paint_statues(p, objects, np_to_py_rng(np.random.default_rng(3)))
    bakery_front(p)
    merchant_front(p)

    # --- vines and moss creeping over walls
    ivy = random.Random(99)
    for _ in range(90):
        bx0, by0, bx1, by1 = ivy.choice(LANDMARK_BOXES[:9])
        vx = ivy.uniform(bx0 + 2, bx1 - 2)
        vy = by1 - ivy.uniform(2, 34)
        for k in range(ivy.randint(3, 6)):
            p.ellipse(vx + ivy.uniform(-3, 3), vy + k * 3, ivy.uniform(2.2, 4), ivy.uniform(2, 3.4), fill=mix((70, 100, 72), (110, 136, 96), ivy.random()) + (200,))

    # --- global finish: a cool, slightly desaturated grade + a gentle vignette
    small = im.resize((W, H), Image.LANCZOS)
    arr = np.asarray(small).astype(np.float32)
    gray = arr.mean(axis=2, keepdims=True)
    arr = gray + (arr - gray) * 0.82
    arr *= np.array([1.0, 1.02, 1.07], dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    v = 1 - 0.16 * (((xx - W / 2) / (W / 2)) ** 2 * 0.7 + ((yy - H / 2) / (H / 2)) ** 2 * 0.9)
    arr *= v[..., None]
    arr += rng_np.normal(0, 1.6, size=arr.shape[:2])[..., None]
    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    out.save(MAP_DIR / "background.png", optimize=True)
    print(f"wrote {MAP_DIR / 'background.png'} ({W}x{H})")
    return out


class _Adapter:
    """random.Random-like wrapper over numpy's Generator for the few methods make_cobbles needs."""

    def __init__(self, gen):
        self.gen = gen

    def uniform(self, a, b):
        return float(self.gen.uniform(a, b))

    def random(self, size=None):
        return self.gen.random(size)

    def normal(self, *args, **kwargs):
        return self.gen.normal(*args, **kwargs)

    def choice(self, seq):
        return seq[int(self.gen.integers(len(seq)))]


def np_to_py_rng(gen):
    return _Adapter(gen)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="also write the background with blocked areas tinted red")
    parser.add_argument("--collision-only", action="store_true")
    args = parser.parse_args()
    MAP_DIR.mkdir(parents=True, exist_ok=True)
    objects = load_objects()
    verify_star_anchor(objects)
    collision = build_collision(objects)
    background = None
    if not args.collision_only:
        background = build_background()
    if args.preview:
        base = background or Image.open(MAP_DIR / "background.png").convert("RGB")
        tint = collision.convert("L").point(lambda v: 120 if v < 128 else 0)
        Image.composite(Image.new("RGB", base.size, (255, 0, 0)), base, tint).save(args.preview)


if __name__ == "__main__":
    main()
