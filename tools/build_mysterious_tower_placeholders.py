"""Build deliberately simple, replaceable PNGs for the mysterious tower image-map package.

These are development placeholders, not generated replacements for a supplied background.
The source remains this script; a future approved painted background may replace only
background.png and collision.png after human collision review.
"""

from __future__ import annotations

from pathlib import Path
import random
import struct
import zlib

WIDTH = 960
HEIGHT = 720
ROOT = Path(__file__).resolve().parents[1]


def canvas(color: tuple[int, int, int, int]) -> bytearray:
    return bytearray(color * (WIDTH * HEIGHT))


def fill_rect(pixels: bytearray, x: int, y: int, width: int, height: int, color: tuple[int, int, int, int]) -> None:
    for row in range(max(0, y), min(HEIGHT, y + height)):
        start = (row * WIDTH + max(0, x)) * 4
        end = (row * WIDTH + min(WIDTH, x + width)) * 4
        pixels[start:end] = bytes(color) * max(0, min(WIDTH, x + width) - max(0, x))


def fill_ellipse(pixels: bytearray, cx: int, cy: int, rx: int, ry: int, color: tuple[int, int, int, int]) -> None:
    for y in range(max(0, cy - ry), min(HEIGHT, cy + ry + 1)):
        dy = (y - cy) / ry
        if abs(dy) > 1:
            continue
        span = int(rx * (1 - dy * dy) ** 0.5)
        fill_rect(pixels, cx - span, y, span * 2 + 1, 1, color)


def write_png(path: Path, pixels: bytearray) -> None:
    rows = b"".join(b"\x00" + bytes(pixels[y * WIDTH * 4:(y + 1) * WIDTH * 4]) for y in range(HEIGHT))

    def chunk(kind: bytes, content: bytes) -> bytes:
        return struct.pack(">I", len(content)) + kind + content + struct.pack(">I", zlib.crc32(kind + content) & 0xFFFFFFFF)

    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")
    path.write_bytes(data)


def draw_exterior() -> tuple[bytearray, bytearray]:
    background = canvas((58, 89, 60, 255))
    random.seed(41)
    for _ in range(520):
        x, y = random.randrange(WIDTH), random.randrange(HEIGHT)
        shade = random.choice([(49, 78, 53, 255), (69, 101, 62, 255), (79, 109, 63, 255)])
        fill_rect(background, x, y, random.randrange(2, 7), random.randrange(2, 7), shade)

    # The ruined tower is an old stone landmark: dark roof, uneven blocks, and a small door.
    for row in range(120):
        inset = abs(60 - row) * 2
        fill_rect(background, 288 + inset, 28 + row, 384 - inset * 2, 1, (49, 48, 53, 255))
    fill_rect(background, 340, 148, 280, 138, (94, 91, 82, 255))
    fill_rect(background, 352, 160, 256, 114, (111, 107, 95, 255))
    for x in range(360, 600, 40):
        for y in range(170, 270, 23):
            fill_rect(background, x + (y // 23 % 2) * 12, y, 27, 14, (89, 87, 80, 255))
    fill_rect(background, 432, 248, 96, 54, (48, 43, 42, 255))
    fill_ellipse(background, 480, 248, 48, 31, (48, 43, 42, 255))
    fill_rect(background, 416, 284, 128, 436, (132, 124, 99, 255))
    for y in range(300, 720, 24):
        fill_rect(background, 416, y, 128, 2, (95, 91, 75, 255))
    for y in range(306, 720, 36):
        fill_rect(background, 478, y, 3, 18, (103, 99, 82, 255))
    fill_ellipse(background, 480, 342, 170, 80, (126, 117, 93, 255))
    # A few fixed shrubs make the narrow approach legible without implying a settled area.
    for x, y in ((178, 530), (252, 274), (730, 308), (778, 530), (160, 170), (794, 166)):
        fill_ellipse(background, x, y, 42, 29, (34, 61, 45, 255))
        fill_ellipse(background, x - 12, y - 16, 24, 21, (46, 77, 49, 255))

    collision = canvas((0, 0, 0, 255))
    fill_rect(collision, 416, 276, 128, 444, (255, 255, 255, 255))
    fill_ellipse(collision, 480, 346, 172, 86, (255, 255, 255, 255))
    return background, collision


def draw_first_floor() -> tuple[bytearray, bytearray]:
    background = canvas((31, 32, 34, 255))
    fill_rect(background, 152, 76, 656, 592, (61, 59, 55, 255))
    fill_rect(background, 176, 100, 608, 544, (108, 103, 91, 255))
    for x in range(184, 784, 32):
        for y in range(108, 644, 28):
            shade = (114, 109, 95, 255) if (x // 32 + y // 28) % 2 else (100, 97, 87, 255)
            fill_rect(background, x, y, 28, 24, shade)
    # Heavy walls and a vacant central dais leave room for the OBJECT-layer core.
    for x in (152, 760):
        fill_rect(background, x, 76, 48, 592, (52, 51, 49, 255))
    fill_rect(background, 152, 76, 656, 48, (52, 51, 49, 255))
    fill_rect(background, 152, 620, 280, 48, (52, 51, 49, 255))
    fill_rect(background, 528, 620, 280, 48, (52, 51, 49, 255))
    for x, y in ((248, 184), (712, 184), (248, 530), (712, 530)):
        fill_ellipse(background, x, y, 26, 26, (71, 68, 62, 255))
        fill_rect(background, x - 18, y - 16, 36, 24, (82, 78, 69, 255))
    fill_ellipse(background, 480, 336, 96, 42, (77, 73, 65, 255))
    fill_ellipse(background, 480, 326, 78, 30, (96, 90, 77, 255))
    fill_rect(background, 432, 620, 96, 48, (74, 66, 57, 255))

    collision = canvas((0, 0, 0, 255))
    fill_rect(collision, 200, 124, 560, 496, (255, 255, 255, 255))
    fill_rect(collision, 432, 620, 96, 48, (255, 255, 255, 255))
    return background, collision


def main() -> None:
    exterior_background, exterior_collision = draw_exterior()
    first_floor_background, first_floor_collision = draw_first_floor()
    write_png(ROOT / "assets/maps/mysterious_tower_exterior/background.png", exterior_background)
    write_png(ROOT / "assets/maps/mysterious_tower_exterior/collision.png", exterior_collision)
    write_png(ROOT / "assets/maps/mysterious_tower_1f/background.png", first_floor_background)
    write_png(ROOT / "assets/maps/mysterious_tower_1f/collision.png", first_floor_collision)


if __name__ == "__main__":
    main()
