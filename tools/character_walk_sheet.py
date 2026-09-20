# -*- coding: utf-8 -*-
"""Shared pipeline for turning a 12-image walk-cycle reference set (正面/うしろ/
右/左 x 3 frames each) into a CURRENT Phaser spritesheet PNG.

Used by tools/build_protagonist_sheet.py and tools/build_tarosa_sheet.py.
Each of those is a thin per-character wrapper that just points at its own
source directory / output path and prints the resulting frame geometry to
copy into the matching src/config/*Sprite.ts file.

Pipeline per frame:
  1. Alpha-trim to the tight bounding box (raises OpaqueReferenceFrameError if
     a frame has no real transparency at all -- see that class's docstring).
  2. Normalize scale so every frame's character height matches the global
     median (reference renders are occasionally generated noticeably
     smaller/larger than the rest; this keeps the walk cycle from pulsing
     in size).
  3. Downscale (premultiplied-alpha, high quality) to the final in-game
     character height.
  4. Composite into a fixed-size cell, horizontally centered and
     bottom-aligned (feet on a common baseline) so the walk animation
     doesn't jitter.
  5. Assemble a 3-column (frame 1/2/3) x 4-row (down/left/right/up) sheet.
"""
import numpy as np
from PIL import Image
from pathlib import Path

Direction = tuple[str, list[str]]


ALPHA_TRIM_THRESHOLD = 128
OPAQUE_BACKGROUND_ALPHA_MIN = 250


class OpaqueReferenceFrameError(ValueError):
    """Raised when a reference render has no real transparency at all (a solid
    background baked in instead of alpha). This is rare, but worth failing
    loudly on rather than guessing: reconstructing alpha from color alone
    (flood-filling the background by color similarity) was tried and produced
    a visibly degraded frame here, because the background color matched the
    character's own black outline strokes -- the flood fill couldn't tell them
    apart and erased the outline everywhere it touched the border, leaving a
    washed-out, outline-less character. The reliable fix is either a re-export
    with real transparency, or substituting a different frame/pose for this
    slot in the character's build_*.py DIRECTIONS list (see build_mirei_sheet.py
    for an example: 左3.png was replaced with a second copy of 左1.png)."""


def alpha_trim(im: Image.Image, label: str = "") -> Image.Image:
    """Crop to the character's silhouette, not just any nonzero alpha.

    Several reference renders carry scattered near-invisible noise specks
    (alpha>0 but tiny, likely a generation/compression artifact) far from the
    character. A naive getbbox() on raw alpha treats those specks as content
    and returns a bbox close to the full canvas, which then throws off the
    per-frame height normalization in build_walk_sheet. Threshold first so the
    detected bbox follows the actual character; the returned crop still keeps
    the original (unthresholded) alpha, so real edge anti-aliasing is preserved.
    """
    im = im.convert("RGBA")
    alpha = im.split()[3]
    if alpha.getextrema()[0] >= OPAQUE_BACKGROUND_ALPHA_MIN:
        raise OpaqueReferenceFrameError(f"{label or '(unnamed frame)'} has no real transparency (fully opaque)")
    mask = alpha.point(lambda a: 255 if a >= ALPHA_TRIM_THRESHOLD else 0)
    bbox = mask.getbbox()
    return im.crop(bbox)


def premultiplied_resize(im: Image.Image, new_w: int, new_h: int) -> Image.Image:
    """Resize RGBA with premultiplied alpha so transparent-black surroundings
    don't bleed a dark halo into the downscaled edges."""
    arr = np.asarray(im).astype(np.float32)
    rgb = arr[..., :3]
    a = arr[..., 3:4]
    premul = np.concatenate([rgb * (a / 255.0), a], axis=-1).astype(np.uint8)
    premul_im = Image.fromarray(premul, "RGBA")
    resized = premul_im.resize((new_w, new_h), Image.LANCZOS, reducing_gap=3.0)
    r_arr = np.asarray(resized).astype(np.float32)
    out_rgb = r_arr[..., :3]
    out_a = r_arr[..., 3:4]
    safe_a = np.where(out_a > 1.0, out_a, 1.0)
    unpremul_rgb = np.clip(out_rgb / (safe_a / 255.0), 0, 255)
    unpremul_rgb = np.where(out_a > 1.0, unpremul_rgb, 0)
    out = np.concatenate([unpremul_rgb, out_a], axis=-1).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def build_walk_sheet(
    src_dir: Path,
    directions: list[Direction],
    out_path: Path,
    final_char_height: int = 64,
    pad_side: int = 3,
    pad_top: int = 3,
    pad_bottom: int = 3,
) -> dict:
    """directions: [(row_name, [frame1.png, frame2.png, frame3.png]), ...] in
    the row order the sheet should use (down, left, right, up by convention).
    Returns {"frame_width", "frame_height", "baseline_y"} for the generated sheet.
    """
    raw = {}
    for _direction, files in directions:
        for fname in files:
            im = Image.open(src_dir / fname)
            raw[fname] = alpha_trim(im, label=str(src_dir / fname))

    heights = [im.height for im in raw.values()]
    target_raw_height = float(np.median(heights))
    print(f"raw crop heights: {sorted(heights)}")
    print(f"global median raw height: {target_raw_height:.1f}")

    normalized = {}
    for fname, im in raw.items():
        scale = target_raw_height / im.height
        new_w = max(1, round(im.width * scale))
        new_h = max(1, round(im.height * scale))
        normalized[fname] = premultiplied_resize(im, new_w, new_h)
        if abs(scale - 1.0) > 0.03:
            print(f"  normalized {fname}: raw {im.size} -> scale {scale:.3f} -> {new_w}x{new_h}")

    downscale_ratio = final_char_height / target_raw_height
    final_frames = {}
    for fname, im in normalized.items():
        new_w = max(1, round(im.width * downscale_ratio))
        new_h = max(1, round(im.height * downscale_ratio))
        final_frames[fname] = premultiplied_resize(im, new_w, new_h)

    max_w = max(im.width for im in final_frames.values())
    max_h = max(im.height for im in final_frames.values())
    canvas_w = max_w + pad_side * 2
    canvas_h = max_h + pad_top + pad_bottom
    # round up to even numbers, friendlier for centering/tiling.
    canvas_w += canvas_w % 2
    canvas_h += canvas_h % 2
    print(f"final per-frame size range: max {max_w}x{max_h}")
    print(f"canvas cell size: {canvas_w}x{canvas_h}")

    baseline_y = canvas_h - pad_bottom  # feet sit on this line

    sheet = Image.new("RGBA", (canvas_w * 3, canvas_h * len(directions)), (0, 0, 0, 0))
    for row, (direction, files) in enumerate(directions):
        for col, fname in enumerate(files):
            frame = final_frames[fname]
            px = (canvas_w - frame.width) // 2
            py = baseline_y - frame.height
            cell_x = col * canvas_w
            cell_y = row * canvas_h
            sheet.alpha_composite(frame, (cell_x + px, cell_y + py))
            print(f"  placed {direction} frame{col + 1} ({fname}) at cell ({col},{row}) size {frame.size} offset ({px},{py})")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)
    print(f"saved {out_path} size={sheet.size}")
    print(f"FRAME_WIDTH={canvas_w} FRAME_HEIGHT={canvas_h} BASELINE_Y={baseline_y}")

    return {"frame_width": canvas_w, "frame_height": canvas_h, "baseline_y": baseline_y}
