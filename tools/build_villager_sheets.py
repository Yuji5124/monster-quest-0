# -*- coding: utf-8 -*-
"""Normalize the supplied villager sheets into Phaser-ready walk sheets.

The source files under ``assets/characters/reference/reference/村人たち`` are
the preserved, user-supplied sources.  Each is a 3-column × 4-row sheet in
the game's standard direction order (down, left, right, up).  Their generated
canvas dimensions vary by a few pixels, so this tool extracts each cell,
normalizes it to a shared 70×70 frame with a bottom-centre foot anchor, and
writes a compact runtime copy under ``assets/characters/npc``.

Run this after adding or replacing a source sheet:
    python tools/build_villager_sheets.py
"""
from pathlib import Path

from PIL import Image

from character_walk_sheet import alpha_trim, premultiplied_resize


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT / "assets" / "characters" / "reference" / "reference" / "村人たち"
OUTPUT_DIR = REPO_ROOT / "assets" / "characters" / "npc"

# Use the most recent transparent 3×4 sheet for each supplied villager.  The
# older/duplicate generations remain untouched in SOURCE_DIR for reference.
SOURCES = {
    "villager_01": "image-gen-1(20260923-093758).png",
    "villager_02": "image-gen-2(20260923-093803).png",
    "villager_03": "image-gen-3(20260923-093809).png",
    "villager_04": "image-gen-4(8).png",
    "villager_05": "image-gen-5(8).png",
    "villager_06": "image-gen-6(8).png",
    "villager_07": "image-gen-7(6).png",
    "villager_08": "image-gen-8(6).png",
    "villager_09": "image-gen-9(6).png",
    "villager_10": "image-gen-10(3).png",
}

FRAME_WIDTH = 70
FRAME_HEIGHT = 70
BASELINE_Y = 67
FINAL_CHARACTER_HEIGHT = 64


def cell_bounds(index: int, count: int, length: int) -> tuple[int, int]:
    """Split a generated canvas without losing a remainder pixel."""
    return round(index * length / count), round((index + 1) * length / count)


def build_sheet(source_path: Path, output_path: Path) -> None:
    source = Image.open(source_path).convert("RGBA")
    frames: list[Image.Image] = []
    for row in range(4):
        top, bottom = cell_bounds(row, 4, source.height)
        for column in range(3):
            left, right = cell_bounds(column, 3, source.width)
            frames.append(alpha_trim(source.crop((left, top, right, bottom)), f"{source_path} cell {row},{column}"))

    # A single character can have one wider side-facing frame; use the largest
    # trimmed frame for one scale so its walk cycle never pulses in size.
    source_height = max(frame.height for frame in frames)
    normalized: list[Image.Image] = []
    for frame in frames:
        new_height = round(frame.height * FINAL_CHARACTER_HEIGHT / source_height)
        new_width = round(frame.width * new_height / frame.height)
        if new_width > FRAME_WIDTH - 4 or new_height > FRAME_HEIGHT - 3:
            raise ValueError(f"{source_path.name} does not fit the {FRAME_WIDTH}x{FRAME_HEIGHT} runtime frame")
        normalized.append(premultiplied_resize(frame, new_width, new_height))

    sheet = Image.new("RGBA", (FRAME_WIDTH * 3, FRAME_HEIGHT * 4), (0, 0, 0, 0))
    for index, frame in enumerate(normalized):
        row, column = divmod(index, 3)
        x = column * FRAME_WIDTH + (FRAME_WIDTH - frame.width) // 2
        y = row * FRAME_HEIGHT + BASELINE_Y - frame.height
        sheet.alpha_composite(frame, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)
    print(f"{source_path.name} -> {output_path.relative_to(REPO_ROOT)} ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    for villager_id, file_name in SOURCES.items():
        build_sheet(SOURCE_DIR / file_name, OUTPUT_DIR / f"{villager_id}_walk.png")
