#!/usr/bin/env python3
"""Upscale a source manga image so camera close-ups stay sharp.

Primary path : Real-ESRGAN (x4plus-anime, BSD-3) via the `ncnn` Python package on CPU.
Fallback     : OpenCV Lanczos + light unsharp mask (no model needed).

Usage:
  python scripts/upscale.py <in> <out.png> [--scale 2|4] [--models <dir>] [--lanczos]
The model directory must contain realesrgan-x4plus-anime.param/.bin
(from https://github.com/xinntao/Real-ESRGAN/releases , realesrgan-ncnn-vulkan zip).
"""
import argparse
import os
import sys
import time

import cv2
import numpy as np


def lanczos(img, scale):
    h, w = img.shape[:2]
    up = cv2.resize(img, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
    blur = cv2.GaussianBlur(up, (0, 0), 1.2)
    return cv2.addWeighted(up, 1.35, blur, -0.35, 0)


def esrgan(img, models, tile=192, pad=12):
    import ncnn
    net = ncnn.Net()
    net.opt.use_vulkan_compute = False
    net.opt.num_threads = os.cpu_count() or 4
    net.load_param(os.path.join(models, "realesrgan-x4plus-anime.param"))
    net.load_model(os.path.join(models, "realesrgan-x4plus-anime.bin"))
    S = 4
    h, w = img.shape[:2]
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    out = np.zeros((h * S, w * S, 3), np.float32)
    tiles = [(y, x) for y in range(0, h, tile) for x in range(0, w, tile)]
    t0 = time.time()
    for n, (y, x) in enumerate(tiles):
        y0, x0 = max(0, y - pad), max(0, x - pad)
        y1, x1 = min(h, y + tile + pad), min(w, x + tile + pad)
        patch = np.ascontiguousarray(rgb[y0:y1, x0:x1].transpose(2, 0, 1))
        ex = net.create_extractor()
        ex.input("data", ncnn.Mat(patch))
        _, res = ex.extract("output")
        res = np.array(res).transpose(1, 2, 0)
        ty, tx = (y - y0) * S, (x - x0) * S
        th, tw = (min(h, y + tile) - y) * S, (min(w, x + tile) - x) * S
        out[y * S:y * S + th, x * S:x * S + tw] = res[ty:ty + th, tx:tx + tw]
        if n % 10 == 0:
            print(f"  tile {n + 1}/{len(tiles)}  {time.time() - t0:.0f}s", flush=True)
    out = np.clip(out * 255.0 + 0.5, 0, 255).astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_RGB2BGR)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--scale", type=int, default=4, choices=[2, 4])
    ap.add_argument("--models", default=os.environ.get("ESRGAN_MODELS", "tools/esrgan/models"))
    ap.add_argument("--lanczos", action="store_true", help="skip the model and use Lanczos")
    a = ap.parse_args()

    img = cv2.imread(a.src, cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f"cannot read {a.src}")
    use_model = not a.lanczos and os.path.exists(os.path.join(a.models, "realesrgan-x4plus-anime.bin"))
    if use_model:
        try:
            out = esrgan(img, a.models)
            method = "realesrgan-x4plus-anime (ncnn CPU)"
        except Exception as e:  # missing ncnn package, etc.
            print(f"ESRGAN failed ({e}); falling back to Lanczos")
            use_model = False
    if not use_model:
        out = lanczos(img, 4)
        method = "lanczos"
    if a.scale == 2:
        h, w = out.shape[:2]
        out = cv2.resize(out, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    cv2.imwrite(a.dst, out)
    print(f"{a.dst}: {out.shape[1]}x{out.shape[0]} via {method}")


if __name__ == "__main__":
    main()
