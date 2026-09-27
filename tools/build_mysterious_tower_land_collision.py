"""Build the reviewed collision mask for the initial mysterious-tower exterior.

The original vacant-lot artwork remains at
``assets/maps/reference/reference/ふしぎなとう.png``.  Runtime uses the separate
level-1 tower background, so the old stone tower's walls are blocked while its
south-facing doorway remains walkable.  The grassy plateau and south stone
bridge are otherwise the only walkable surfaces; trees, water, cliffs and the
outer rim remain blocked.  Shapes are authored on the map's 8px collision grid
and verified by ``tests/bodyPassability.test.mjs``.
"""

from pathlib import Path

from PIL import Image, ImageDraw


WIDTH = 1536
HEIGHT = 1024
CELL_SIZE = 8
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "maps" / "mysterious_tower_exterior" / "collision.png"


def main() -> None:
    collision = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
    draw = ImageDraw.Draw(collision)

    # Read from the visible grassy plateau clockwise.  Vertices deliberately
    # stay on 8px boundaries so the runtime's collision cells remain binary.
    plateau = [
        (704, 184), (832, 184), (952, 232), (1048, 320), (1120, 432),
        (1132, 584), (1080, 688), (984, 768), (864, 832), (768, 856),
        (664, 824), (560, 784), (464, 696), (400, 592), (408, 496),
        (464, 400), (552, 304), (648, 232),
    ]
    draw.polygon(plateau, fill=(255, 255, 255, 255))

    # The visible southern stone bridge is the sole world-map approach.
    draw.rectangle((720, 848, 815, 927), fill=(255, 255, 255, 255))

    # Initial construction: the old stone tower is solid except for its dark,
    # south-facing archway.  The doorway opens into the entrance EVENT zone.
    draw.rectangle((640, 96, 855, 279), fill=(0, 0, 0, 255))
    draw.rectangle((608, 280, 703, 383), fill=(0, 0, 0, 255))
    draw.rectangle((816, 280, 879, 383), fill=(0, 0, 0, 255))
    collision.save(OUTPUT)
    print(f"wrote {OUTPUT.relative_to(ROOT)} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
