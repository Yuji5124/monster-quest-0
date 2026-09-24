"""Normalize supplied 4x4 RGBA monster sheets into Phaser-ready 256x256 PNGs.

Usage example (the source paths are intentionally supplied by the caller, never assumed):
  python tools/normalize_majin_cave_monster_sheets.py --output-dir assets/monsters/majin_cave \
    --input purin=C:/path/purin.png --input tamago_ghost=C:/path/ghost.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

TARGET_SIZE = (256, 256)
SOURCE_SIZE = (1254, 1254)
FRAME_SIZE = 64
FRAME_COUNT = 16
CHART_X_BOUNDS = (466, 623, 783, 944, 1105)
CHART_Y_BOUNDS = (0, 107, 213, 315, 419, 524, 634, 744, 853, 956)
CHART_ANIMATION_ROWS = (0, 5, 7, 8)  # idle / physical attack / damage / defeat


def parse_input(value: str) -> tuple[str, Path]:
    monster_id, separator, source = value.partition("=")
    if not separator or not monster_id or not source:
        raise argparse.ArgumentTypeError("--input must use monster_id=source_path")
    return monster_id, Path(source)


def tight_alpha_crop(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    # UI guide lines in the supplied chart are faint. Only real opaque sprite pixels set bounds.
    mask = alpha.point(lambda value: 255 if value >= 128 else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("frame has no visible RGBA pixels")
    return image.crop(bounds)


def normalize_chart(source: Image.Image) -> Image.Image:
    if source.size != (1536, 1024):
        raise ValueError(f"expected chart source (1536, 1024), received {source.size}")
    source = source.convert("RGBA")
    # The provided chart contains magenta slot guides. They are documentation, not art.
    pixels = source.load()
    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha and red >= 180 and green <= 105 and blue <= 180:
                pixels[x, y] = (red, green, blue, 0)
    frames = []
    for row in CHART_ANIMATION_ROWS:
        for column in range(4):
            crop = source.crop((
                CHART_X_BOUNDS[column], CHART_Y_BOUNDS[row],
                CHART_X_BOUNDS[column + 1], CHART_Y_BOUNDS[row + 1],
            ))
            frames.append(tight_alpha_crop(crop))
    largest_width = max(frame.width for frame in frames)
    largest_height = max(frame.height for frame in frames)
    scale = min(56 / largest_width, 58 / largest_height)
    sheet = Image.new("RGBA", TARGET_SIZE)
    for index, frame in enumerate(frames):
        width = max(1, round(frame.width * scale))
        height = max(1, round(frame.height * scale))
        sprite = frame.resize((width, height), Image.Resampling.NEAREST)
        column = index % 4
        row = index // 4
        x = column * FRAME_SIZE + (FRAME_SIZE - width) // 2
        y = row * FRAME_SIZE + FRAME_SIZE - height - 3
        sheet.alpha_composite(sprite, (x, y))
    return sheet


def normalize(monster_id: str, source: Path, output_dir: Path, layout: str) -> None:
    with Image.open(source) as image:
        if "A" not in image.getbands():
            raise ValueError(f"{monster_id}: source has no alpha channel")
        if layout == "chart":
            normalized = normalize_chart(image)
        elif image.size != SOURCE_SIZE:
            raise ValueError(f"{monster_id}: expected source {SOURCE_SIZE}, received {image.size}")
        else:
            normalized = image.convert("RGBA").resize(TARGET_SIZE, Image.Resampling.NEAREST)
    if normalized.size != TARGET_SIZE:
        raise AssertionError(f"{monster_id}: normalization did not produce {TARGET_SIZE}")
    if normalized.getchannel("A").getextrema()[0] == 255:
        raise ValueError(f"{monster_id}: expected transparent pixels in the supplied RGBA sheet")
    output = output_dir / f"monster_{monster_id}.png"
    normalized.save(output)
    print(f"{monster_id}: {output} ({TARGET_SIZE[0]}x{TARGET_SIZE[1]}, {FRAME_COUNT} x {FRAME_SIZE}px frames)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--layout", choices=("grid", "chart"), default="grid")
    parser.add_argument("--input", action="append", required=True, type=parse_input)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for monster_id, source in args.input:
        normalize(monster_id, source, args.output_dir, args.layout)


if __name__ == "__main__":
    main()
