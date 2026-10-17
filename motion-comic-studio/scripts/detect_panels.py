#!/usr/bin/env python3
"""Detect manga panels by recursive XY-cut on white gutters.

Usage: python scripts/detect_panels.py <image> <out.json> [--rtl] [--pages 2]
Writes [{id, page, x, y, w, h}] in source-pixel coordinates.
The result is a starting point: copy it into project/storyboard.json and fix by hand.
--rtl orders pages right-to-left (Japanese spread). Panels inside a page are
ordered top-to-bottom, then right-to-left with --rtl (left-to-right otherwise);
reorder in storyboard.json when a comic breaks that convention.
"""
import argparse
import json

import cv2
import numpy as np

WHITE = 225     # gray level treated as gutter paper
FILL = 0.92     # fraction of a line that must be white to count as gutter
MIN_GAP = 3     # gutter thickness in px
MIN_PANEL = 40  # smallest panel side in px


def runs(mask):
    out, start = [], None
    for i, v in enumerate(list(mask) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i))
            start = None
    return out


def split(white, x, y, w, h, depth=0):
    region = white[y:y + h, x:x + w]
    for axis in (0, 1):  # 0: horizontal gutters (rows), 1: vertical gutters (cols)
        prof = region.mean(axis=1 - axis)
        gaps = [(a, b) for a, b in runs(prof > FILL) if b - a >= MIN_GAP and a > 0 and b < len(prof)]
        if not gaps:
            continue
        cuts, prev = [], 0
        for a, b in gaps:
            cuts.append((prev, a))
            prev = b
        cuts.append((prev, len(prof)))
        cuts = [(a, b) for a, b in cuts if b - a >= MIN_PANEL]
        if len(cuts) < 2:
            continue
        out = []
        for a, b in cuts:
            if axis == 0:
                out += split(white, x, y + a, w, b - a, depth + 1)
            else:
                out += split(white, x + a, y, b - a, h, depth + 1)
        return out
    # trim remaining white border
    ys, xs = np.where(region < 0.5)
    if len(xs) == 0:
        return []
    return [(x + xs.min(), y + ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("out")
    ap.add_argument("--rtl", action="store_true")
    ap.add_argument("--pages", type=int, default=2)
    a = ap.parse_args()
    g = cv2.cvtColor(cv2.imread(a.image), cv2.COLOR_BGR2GRAY)
    H, W = g.shape
    white = (g > WHITE).astype(np.float32)
    pw = W // a.pages
    pages = list(range(a.pages))
    if a.rtl:
        pages.reverse()
    panels = []
    for n, p in enumerate(pages):
        boxes = split(white, p * pw, 0, pw, H)
        boxes = [b for b in boxes if b[2] >= MIN_PANEL and b[3] >= MIN_PANEL]
        boxes.sort(key=lambda b: (round(b[1] / 40), -b[0] if a.rtl else b[0]))
        for b in boxes:
            panels.append({"id": f"p{len(panels) + 1:02d}", "page": n + 1,
                           "x": int(b[0]), "y": int(b[1]), "w": int(b[2]), "h": int(b[3])})
    json.dump({"source": a.image, "size": [W, H], "panels": panels}, open(a.out, "w"), indent=1, ensure_ascii=False)
    for p in panels:
        print(p)


if __name__ == "__main__":
    main()
