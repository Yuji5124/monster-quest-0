#!/usr/bin/env python3
"""Bake project/storyboard.json into render-ready layers.

Inputs : storyboard.json, the source image, and an upscaled master (scripts/upscale.py)
Outputs: assets/build/
  panels/<P>.jpg          panel crops from the CLEAN master (pop-in bubbles / sfx letters inpainted away)
  bubbles/<id>.png        bubble cut-outs with alpha (original pixels)
  sfx/<id>.png            onomatopoeia cut-outs with alpha
  parts/<id>.png          character parts (ellipse feather mask) from the clean master
  mouths/<id>.png         "closed mouth" overlay used for lip flaps
  manifest.json           world-space positions (source px * upscale) for the player
  debug_overlay.jpg       everything drawn on the spread for manual checking

Usage: python scripts/bake.py [--project project] [--master assets/work/master_x4.png]
"""
import argparse
import json
import os

import cv2
import numpy as np


def white_mask(img, rect, kind):
    x, y, w, h = rect
    roi = img[y:y + h, x:x + w]
    mn, mx = roi.min(2), roi.max(2)
    if kind == "sfx":
        wm = (mn > 200).astype(np.uint8)
        m = cv2.dilate(wm, np.ones((3, 3), np.uint8), iterations=2)
    else:
        wm = ((mn > 236) & ((mx.astype(int) - mn) < 18)).astype(np.uint8)
        wm = cv2.morphologyEx(wm, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(wm, 8)
        keep = np.zeros_like(wm)
        for i in range(1, n):
            if st[i, 4] > 150:
                keep[lab == i] = 1
        if kind == "caption":
            # caption boxes are rectangles with a black frame: take their bounding box
            ys, xs = np.where(keep)
            keep[:] = 0
            keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1] = 1
        cs, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        filled = np.zeros_like(keep)
        cv2.drawContours(filled, cs, -1, 1, -1)
        m = cv2.dilate(filled, np.ones((3, 3), np.uint8), iterations=2)  # include the ink outline
    full = np.zeros(img.shape[:2], np.uint8)
    full[y:y + h, x:x + w] = m
    return full


def pushpull_fill(img, hole):
    """Smooth hole fill: mask-weighted image pyramid (push-pull). Gives soft, colour-matched fills."""
    f = img.astype(np.float32)
    w = (1 - hole).astype(np.float32)
    levels = []
    cf, cw = f * w[..., None], w
    while min(cw.shape) > 4:
        levels.append((cf, cw))
        cf = cv2.resize(cf, (max(1, cf.shape[1] // 2), max(1, cf.shape[0] // 2)), interpolation=cv2.INTER_AREA)
        cw = cv2.resize(cw, (max(1, cw.shape[1] // 2), max(1, cw.shape[0] // 2)), interpolation=cv2.INTER_AREA)
    est = cf / np.maximum(cw, 1e-6)[..., None]
    for lf, lw in reversed(levels):
        up = cv2.resize(est, (lf.shape[1], lf.shape[0]), interpolation=cv2.INTER_LINEAR)
        known = lf / np.maximum(lw, 1e-6)[..., None]
        a = np.clip(lw * 1.0, 0, 1)[..., None]
        est = known * a + up * (1 - a)
    return est


def texture_fill(img, hole, rect, seed=0):
    """Soft colour-matched fill (push-pull) plus film grain. Copying nearby detail produced
    recognisable ghost faces, so only grain is added; the timeline keeps empty states short."""
    smooth = pushpull_fill(img, hole)
    grain = np.random.default_rng(seed).normal(0, 7, img.shape[:2])[..., None]
    out = smooth + grain
    m = hole.astype(bool)
    res = img.astype(np.float32).copy()
    res[m] = out[m]
    return np.clip(res, 0, 255).astype(np.uint8)


def ellipse_alpha(w, h, feather):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx + 0.5) / w * 2 - 1) ** 2 + ((yy + 0.5) / h * 2 - 1) ** 2)
    a = np.clip((1 - d) / max(1e-3, feather), 0, 1)
    return a * a * (3 - 2 * a)


def norm_to_world(panel, u, v, S):
    x, y, w, h = panel
    return (x + u * w) * S, (y + v * h) * S


def crop_rgba(img, alpha, x0, y0):
    h, w = alpha.shape
    H, W = img.shape[:2]
    out = np.zeros((h, w, 4), np.uint8)
    sx0, sy0 = max(0, x0), max(0, y0)
    sx1, sy1 = min(W, x0 + w), min(H, y0 + h)
    out[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0, :3] = img[sy0:sy1, sx0:sx1]
    out[..., 3] = (alpha * 255).astype(np.uint8)
    return out


def clip_to_panel(alpha, x0, y0, panel, S):
    """Zero alpha outside the panel so parts never paint over gutters."""
    px, py, pw, ph = [v * S for v in panel]
    h, w = alpha.shape
    yy, xx = np.mgrid[0:h, 0:w]
    inside = (xx + x0 >= px) & (xx + x0 < px + pw) & (yy + y0 >= py) & (yy + y0 < py + ph)
    return alpha * inside


def closed_mouth(clean, cx, cy, mw, mh):
    """Make a closed-mouth patch: inpaint the dark/red mouth interior with skin, draw a lip line."""
    x0, y0 = int(cx - mw), int(cy - mh)
    patch = clean[y0:y0 + int(2 * mh), x0:x0 + int(2 * mw)].copy()
    ph, pw = patch.shape[:2]
    ell = ellipse_alpha(pw, ph, 0.01) > 0.5
    b, g, r = [patch[..., i].astype(int) for i in range(3)]
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    inner = ((luma < 120) | ((r - g > 55) & (g < 140))) & ell
    inner = cv2.morphologyEx(inner.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(inner, 8)
    if n <= 1:
        return None
    k = 1 + int(np.argmax(st[1:, 4]))  # biggest blob = the open mouth
    mouth = (lab == k).astype(np.uint8)
    ys, xs = np.where(mouth)
    mouth = cv2.dilate(mouth, np.ones((5, 5), np.uint8), iterations=2)
    filled = cv2.inpaint(patch, mouth, max(4, pw // 12), cv2.INPAINT_TELEA)
    filled = cv2.GaussianBlur(filled, (0, 0), 1.0) * 0.6 + filled * 0.4
    filled = filled.astype(np.uint8)
    # lip line: a gentle curve across the old mouth opening, a little above its centre
    x_a, x_b = xs.min(), xs.max()
    y_mid = ys.min() + (ys.max() - ys.min()) * 0.4
    pts = []
    for t in np.linspace(0, 1, 24):
        xx = x_a + (x_b - x_a) * (0.12 + 0.76 * t)
        yy = y_mid + (x_b - x_a) * 0.06 * (1 - (2 * t - 1) ** 2) * -1
        pts.append([xx, yy])
    th = max(2, int((x_b - x_a) * 0.06))
    cv2.polylines(filled, [np.array(pts, np.int32)], False, (30, 32, 70), th, cv2.LINE_AA)
    alpha = np.clip(cv2.GaussianBlur(mouth.astype(np.float32), (0, 0), max(2, pw / 30)) * 1.6, 0, 1)
    return crop_rgba(filled, alpha, 0, 0), x0, y0


def find_lamps(src, panel, min_area, limit):
    x, y, w, h = panel
    roi = src[y:y + h, x:x + w].astype(int)
    b, g, r = roi[..., 0], roi[..., 1], roi[..., 2]
    m = ((r > 215) & (g > 150) & (b < 160) & (r - b > 70)).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m, 8)
    lamps = [(st[i, 4], cen[i]) for i in range(1, n) if st[i, 4] >= min_area]
    lamps.sort(key=lambda t: -t[0])
    return [{"u": round(float(c[0] / w), 4), "v": round(float(c[1] / h), 4),
             "r": round(float(np.sqrt(a) / w * 2.2), 4)} for a, c in lamps[:limit]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default="project")
    ap.add_argument("--master", default="assets/work/master_x4.png")
    ap.add_argument("--out", default="assets/build")
    a = ap.parse_args()
    sb = json.load(open(os.path.join(a.project, "storyboard.json"), encoding="utf-8"))
    S = sb["upscale"]
    src = cv2.imread(sb["source"])
    master = cv2.imread(a.master)
    assert master.shape[0] == src.shape[0] * S, "master must be source * upscale"
    for d in ("panels", "bubbles", "sfx", "parts", "mouths"):
        os.makedirs(os.path.join(a.out, d), exist_ok=True)
    P = {k: v["rect"] for k, v in sb["panels"].items()}
    man = {"upscale": S, "size": [src.shape[1] * S, src.shape[0] * S], "panels": {}, "bubbles": {},
           "sfx": {}, "parts": {}, "mouths": {}, "eyes": {}, "lamps": {}}

    # 1) bubble + sfx masks at source resolution, inpaint them out of a clean copy
    hide = np.zeros(src.shape[:2], np.uint8)
    cut = {}
    clean_src = src.copy()
    for group, kind_default in (("bubbles", "bubble"), ("sfxText", "sfx")):
        for bid, b in sb.get(group, {}).items():
            kind = b.get("kind", kind_default)
            m = white_mask(src, b["rect"], kind)
            cut[(group, bid)] = m
            hide |= m
            md = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=2)
            if kind == "sfx":  # thin letters: classic inpaint is fine
                clean_src = cv2.inpaint(clean_src, md, 4, cv2.INPAINT_TELEA)
            else:
                bx, by, bw, bh = b["rect"]
                for pan in sb["panels"].values():  # a bubble may cross gutters: fill each panel separately
                    x, y, w, h = pan["rect"]
                    if bx >= x + w or bx + bw <= x or by >= y + h or by + bh <= y:
                        continue
                    sub = clean_src[y:y + h, x:x + w]
                    clean_src[y:y + h, x:x + w] = texture_fill(sub, md[y:y + h, x:x + w], (bx - x, by - y, bw, bh))
    hide_d = cv2.dilate(hide, np.ones((3, 3), np.uint8), iterations=2)
    clean_up = cv2.resize(clean_src, (master.shape[1], master.shape[0]), interpolation=cv2.INTER_CUBIC)
    grain = np.random.default_rng(3).normal(0, 5, clean_up.shape).astype(np.float32)
    clean_up = np.clip(clean_up.astype(np.float32) + grain, 0, 255)
    soft = cv2.GaussianBlur(cv2.resize(hide_d * 255, (master.shape[1], master.shape[0]),
                                       interpolation=cv2.INTER_LINEAR).astype(np.float32), (0, 0), S * 1.5) / 255
    soft = np.clip(soft * 1.5, 0, 1)[..., None]
    clean = (master * (1 - soft) + clean_up * soft).astype(np.uint8)

    # 2) panels
    for pid, (x, y, w, h) in P.items():
        cv2.imwrite(os.path.join(a.out, "panels", f"{pid}.jpg"),
                    clean[y * S:(y + h) * S, x * S:(x + w) * S], [cv2.IMWRITE_JPEG_QUALITY, 92])
        man["panels"][pid] = {"x": x * S, "y": y * S, "w": w * S, "h": h * S, "src": f"panels/{pid}.jpg"}

    # 3) bubbles / sfx from the ORIGINAL master
    for (group, bid), m in cut.items():
        x, y, w, h = sb[group][bid]["rect"]
        m_up = cv2.resize(m[y:y + h, x:x + w].astype(np.float32), (w * S, h * S), interpolation=cv2.INTER_LINEAR)
        m_up = np.clip(cv2.GaussianBlur(m_up, (0, 0), 1.2) * 1.3, 0, 1)
        rgba = crop_rgba(master, m_up, x * S, y * S)
        sub = "bubbles" if group == "bubbles" else "sfx"
        cv2.imwrite(os.path.join(a.out, sub, f"{bid}.png"), rgba)
        man[sub][bid] = {"x": x * S, "y": y * S, "w": w * S, "h": h * S, "src": f"{sub}/{bid}.png",
                         "panel": sb[group][bid]["panel"]}

    # 4) parts (from clean master, clipped to the panel)
    for pid, p in sb["parts"].items():
        pr = P[p["panel"]]
        u0, v0, u1, v1 = p["rect"]
        x0, y0 = [int(round(v)) for v in norm_to_world(pr, u0, v0, S)]
        x1, y1 = [int(round(v)) for v in norm_to_world(pr, u1, v1, S)]
        alpha = ellipse_alpha(x1 - x0, y1 - y0, p.get("feather", 0.15))
        alpha = clip_to_panel(alpha, x0, y0, pr, S)
        cv2.imwrite(os.path.join(a.out, "parts", f"{pid}.png"), crop_rgba(clean, alpha, x0, y0))
        px, py = norm_to_world(pr, *p.get("pivot", [(u0 + u1) / 2, (v0 + v1) / 2]), S)
        man["parts"][pid] = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "panel": p["panel"],
                             "src": f"parts/{pid}.png",
                             "origin": [round((px - x0) / (x1 - x0), 4), round((py - y0) / (y1 - y0), 4)]}

    # 5) closed-mouth overlays
    for mid, m in sb.get("mouths", {}).items():
        pr = P[m["panel"]]
        cx, cy = norm_to_world(pr, *m["center"], S)
        mw, mh = m["size"][0] * pr[2] * S / 2, m["size"][1] * pr[3] * S / 2
        res = closed_mouth(clean, cx, cy, mw, mh)
        if res is None:
            print(f"mouth {mid}: no open mouth found, skipped")
            continue
        rgba, x0, y0 = res
        cv2.imwrite(os.path.join(a.out, "mouths", f"{mid}.png"), rgba)
        man["mouths"][mid] = {"x": x0, "y": y0, "w": rgba.shape[1], "h": rgba.shape[0],
                              "panel": m["panel"], "src": f"mouths/{mid}.png"}

    # 6) eyes / lamps (positions only; drawn live by the player)
    for eid, e in sb.get("eyes", {}).items():
        pr = P[e["panel"]]
        man["eyes"][eid] = {"panel": e["panel"], "color": e.get("color", "#ffcf5a"), "r": e["r"] * pr[2] * S,
                            "points": [list(norm_to_world(pr, u, v, S)) for u, v in e["points"]]}
    for lid, l in sb.get("lamps", {}).items():
        pr = P[l["panel"]]
        lamps = find_lamps(src, pr, l.get("minArea", 6), l.get("max", 40))
        man["lamps"][l["panel"]] = [{"x": norm_to_world(pr, q["u"], q["v"], S)[0],
                                     "y": norm_to_world(pr, q["u"], q["v"], S)[1],
                                     "r": q["r"] * pr[2] * S} for q in lamps]

    json.dump(man, open(os.path.join(a.out, "manifest.json"), "w"), indent=1)

    # 7) debug overlay (source resolution)
    dbg = clean_src.copy()  # shows the inpainted background; red outlines = hidden bubbles/sfx
    cs, _ = cv2.findContours(hide, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(dbg, cs, -1, (0, 0, 255), 1)
    for pid, p in man["parts"].items():
        c = (int(p["x"] / S + p["w"] / S / 2), int(p["y"] / S + p["h"] / S / 2))
        cv2.ellipse(dbg, c, (int(p["w"] / S / 2), int(p["h"] / S / 2)), 0, 0, 360, (0, 255, 0), 1)
        cv2.putText(dbg, pid, (c[0] - 20, c[1]), 0, 0.35, (0, 255, 0), 1)
    for mid, m in man["mouths"].items():
        cv2.rectangle(dbg, (m["x"] // S, m["y"] // S), ((m["x"] + m["w"]) // S, (m["y"] + m["h"]) // S), (255, 0, 255), 1)
    for eid, e in man["eyes"].items():
        for x, y in e["points"]:
            cv2.circle(dbg, (int(x / S), int(y / S)), max(2, int(e["r"] / S)), (0, 255, 255), 1)
    for pl, lamps in man["lamps"].items():
        for q in lamps:
            cv2.circle(dbg, (int(q["x"] / S), int(q["y"] / S)), max(2, int(q["r"] / S)), (255, 200, 0), 1)
    cv2.imwrite(os.path.join(a.out, "debug_overlay.jpg"), cv2.resize(dbg, None, fx=1.3, fy=1.3))
    print("baked:", {k: len(v) for k, v in man.items() if isinstance(v, dict)})


if __name__ == "__main__":
    main()
