"""Pack the supplied 1254px Majin chart into a Phaser-safe 4x4 1280px RGBA sheet.

The source is never redrawn or scaled. Its four unequal 313/314px source cells are copied into
uniform 320px transparent cells and bottom-aligned so the boss's feet share a stable grid anchor.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

SOURCE_SIZE = (1254, 1254)
GRID_SIZE = 4
FRAME_SIZE = 320
TARGET_SIZE = (FRAME_SIZE * GRID_SIZE, FRAME_SIZE * GRID_SIZE)


def grid_edges(length: int) -> list[int]:
    """Split 1254 exactly into four source cells without interpolation or pixel loss."""
    return [round(index * length / GRID_SIZE) for index in range(GRID_SIZE + 1)]


def normalize(source_path: Path, output_path: Path) -> None:
    with Image.open(source_path) as source:
        if source.size != SOURCE_SIZE:
            raise ValueError(f"expected {SOURCE_SIZE[0]}x{SOURCE_SIZE[1]} source, received {source.width}x{source.height}")
        if "A" not in source.getbands():
            raise ValueError("source must be RGBA/contain alpha")
        source = source.convert("RGBA")
        if source.getchannel("A").getextrema()[0] != 0:
            raise ValueError("source must retain transparent pixels")

        target = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
        edges = grid_edges(source.width)
        for row in range(GRID_SIZE):
            for column in range(GRID_SIZE):
                frame = source.crop((edges[column], edges[row], edges[column + 1], edges[row + 1]))
                # Preserve every source pixel; the 6–7px added cell padding is transparent.
                offset_x = column * FRAME_SIZE + (FRAME_SIZE - frame.width) // 2
                offset_y = (row + 1) * FRAME_SIZE - frame.height
                target.alpha_composite(frame, (offset_x, offset_y))

    if target.size != TARGET_SIZE or target.getchannel("A").getextrema()[0] != 0:
        raise AssertionError("normalization did not produce the expected transparent 1280px RGBA sheet")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    target.save(output_path)
    print(f"{output_path}: {TARGET_SIZE[0]}x{TARGET_SIZE[1]} RGBA / 4x4 / {FRAME_SIZE}px frames")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    normalize(args.source, args.output)


if __name__ == "__main__":
    main()
