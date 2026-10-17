#!/usr/bin/env python3
"""Grab frames from a rendered video at given times and tile them into one image (QA helper).

Usage: python scripts/framesheet.py <video.mp4> <out.jpg> 0.5,1.2,3 [--cols 4]
"""
import argparse
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("times")
    ap.add_argument("--cols", type=int, default=4)
    a = ap.parse_args()
    times = [float(t) for t in a.times.split(",")]
    w, h = 480, 270
    rows = (len(times) + a.cols - 1) // a.cols
    sheet = Image.new("RGB", (a.cols * (w + 4), rows * (h + 20)), "black")
    d = ImageDraw.Draw(sheet)
    with tempfile.TemporaryDirectory() as tmp:
        for i, t in enumerate(times):
            f = Path(tmp) / f"{i}.png"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(t), "-i", a.video, "-frames:v", "1",
                            "-vf", f"scale={w}:{h}", str(f)], check=True)
            x, y = (i % a.cols) * (w + 4), (i // a.cols) * (h + 20)
            sheet.paste(Image.open(f), (x, y))
            d.text((x + 4, y + h + 4), f"{t:.2f}s", fill="white")
    sheet.save(a.out, quality=90)
    print(a.out)


if __name__ == "__main__":
    main()
