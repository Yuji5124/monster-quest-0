#!/usr/bin/env python3
"""Blend the Real-ESRGAN x4 result with a Lanczos x4 of the source (60/40).

ESRGAN alone cleans line art but flattens painted texture; the blend keeps the original look.
Usage: python scripts/blend_master.py [--src ...] [--esrgan ...] [--out ...] [--mix 0.6]
"""
import argparse

import cv2

ap = argparse.ArgumentParser()
ap.add_argument("--src", default="assets/source/ginga_ep01_spread.webp")
ap.add_argument("--esrgan", default="assets/work/spread_x4.png")
ap.add_argument("--out", default="assets/work/master_x4.png")
ap.add_argument("--mix", type=float, default=0.6)
a = ap.parse_args()
src, e = cv2.imread(a.src), cv2.imread(a.esrgan)
lan = cv2.resize(src, (e.shape[1], e.shape[0]), interpolation=cv2.INTER_LANCZOS4)
cv2.imwrite(a.out, cv2.addWeighted(e, a.mix, lan, 1 - a.mix, 0))
print(a.out)
