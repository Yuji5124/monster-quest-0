#!/usr/bin/env python3
"""Pipeline checks (no network, no paid services). Run: python tests/test_pipeline.py

Data checks always run. Output checks run when output/final/*.mp4 exists.
"""
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.chdir(ROOT)
FAIL = []
PASS = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name + (f"  ({detail})" if detail else ""))


tl = json.load(open("project/timeline.json", encoding="utf-8"))
sb = json.load(open("project/storyboard.json", encoding="utf-8"))
fx = json.load(open("project/effects_config.json", encoding="utf-8"))
vc = json.load(open("project/voice_config.json", encoding="utf-8"))
vi = json.load(open("assets/audio/voice/voice_index.json")) if os.path.exists("assets/audio/voice/voice_index.json") else {}
man = json.load(open("assets/build/manifest.json")) if os.path.exists("assets/build/manifest.json") else None

# ---------- timeline / storyboard consistency ----------
total = sum(s["dur"] for s in tl["scenes"])
check("total duration within 75-90 s", 75 <= total <= 90, f"{total:.1f}s")
check("7 scenes", len(tl["scenes"]) == 7)
expected = {"s01": "deep-parallax", "s02": "anticipation", "s03": "spring-overshoot", "s04": "overlapping-action",
            "s05": "mask-reveal", "s06": "shake", "s07": "ken-burns"}
for sc in tl["scenes"]:
    eff = sc["effects"]
    check(f"{sc['id']} effect budget (1 main + <=2 sub)", len(eff["sub"]) <= 2)
    for name in [eff["main"]] + eff["sub"]:
        check(f"{sc['id']} effect '{name}' has a library preset", name in fx["presets"])
        card = fx["presets"].get(name, {}).get("card", "")
        check(f"{sc['id']} effect '{name}' cites a library card", card.startswith("effects/"))
    check(f"{sc['id']} main effect from brief present", expected[sc["id"]] in [eff["main"]] + eff["sub"])
    ids = {"bubble": sb["bubbles"], "sfxtext": sb["sfxText"], "part": sb["parts"], "eyes": sb["eyes"], "blink": sb["eyes"]}
    for e in sc["events"]:
        if e["type"] in ids:
            check(f"{sc['id']} event ref {e['id']}", e["id"] in ids[e["type"]])
        if e["type"] == "lipsync":
            check(f"{sc['id']} lipsync mouth {e['mouth']}", e["mouth"] in sb["mouths"])
        if e["type"] == "eyes-talk":
            check(f"{sc['id']} eyes-talk {e['eyes']}", e["eyes"] in sb["eyes"])
        check(f"{sc['id']} event time inside scene ({e['type']}@{e['t']})", 0 <= e["t"] <= sc["dur"])
    for sh in sc["shots"]:
        check(f"{sc['id']} shot panel {sh['panel']}", sh["panel"] in sb["panels"])
    lines = sorted(sc["lines"], key=lambda l: l["at"])
    for a, b in zip(lines, lines[1:] + [None]):
        d = vi.get(a["id"], {}).get("duration")
        check(f"voice exists {a['id']}", d is not None and os.path.exists(f"assets/audio/voice/{a['id']}.wav"))
        if d is None:
            continue
        nxt = b["at"] if b else sc["dur"]
        check(f"{a['id']} not cut off (ends before next line / scene end)", a["at"] + d <= nxt + 1e-6,
              f"{a['at'] + d:.2f} <= {nxt:.2f}")
        check(f"{a['id']} speaker configured", a["speaker"] in vc["speakers"])

all_text = json.dumps(tl, ensure_ascii=False) + json.dumps(sb, ensure_ascii=False)
check("no title logo used", "logo" not in all_text.lower())
check("source is the supplied spread (no external character art)", sb["source"].startswith("assets/source/"))
check("no paid TTS configured", vc["engine"] == "voicevox" and vc["url"].startswith("http://127.0.0.1"))

if man:
    for k in ("panels", "bubbles", "parts", "mouths"):
        for i, v in man[k].items():
            check(f"baked {k}/{i} file", os.path.exists(os.path.join("assets/build", v["src"])))

# ---------- rendered output ----------
final = "output/final/ginga_haguredan_episode01.mp4"
if os.path.exists(final):
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", final],
                                   capture_output=True, text=True).stdout)
    v = [s for s in pr["streams"] if s["codec_type"] == "video"][0]
    a = [s for s in pr["streams"] if s["codec_type"] == "audio"][0]
    check("video h264 1920x1080", v["codec_name"] == "h264" and v["width"] == 1920 and v["height"] == 1080)
    check("video 30 fps", v["r_frame_rate"] == "30/1")
    check("video yuv420p", v.get("pix_fmt") == "yuv420p")
    check("audio aac 48k stereo", a["codec_name"] == "aac" and a["sample_rate"] == "48000" and a["channels"] == 2)
    dv, da = float(v["duration"]), float(a["duration"])
    check("audio/video durations match (sync)", abs(dv - da) < 0.1, f"v={dv:.2f} a={da:.2f}")
    check("final duration matches timeline", abs(dv - total) < 0.1, f"{dv:.2f} vs {total:.2f}")
    # every line audible in the final mix (decode AAC back and compare with quiet frames)
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", final, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True).stdout
    x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    rms = lambda s, e: float(np.sqrt(np.mean(x[int(s * 16000):int(e * 16000)] ** 2) + 1e-12))
    t = 0.0
    for sc in tl["scenes"]:
        start = sc.get("start", t)
        t = start + sc["dur"]
        for L in sc["lines"]:
            s0 = start + L["at"]
            e0 = s0 + vi[L["id"]]["duration"]
            check(f"line audible in final {L['id']}", rms(s0, e0) > 0.03, f"rms={rms(s0, e0):.3f}")
    check("no clipping", float(np.abs(x).max()) < 0.999, f"peak={np.abs(x).max():.3f}")
    # subtitles
    srt = open("output/subtitles.srt", encoding="utf-8").read()
    n_lines = sum(len(sc["lines"]) for sc in tl["scenes"])
    check("subtitles: one cue per line", len(re.findall(r"-->", srt)) == n_lines)
    for clip in ("output/test_clips/scene03_robotta.mp4", "output/test_clips/scene05_orca.mp4"):
        check(f"test clip exists {clip}", os.path.exists(clip))
    check("contact sheet exists", os.path.exists("output/previews/contact_sheet.png"))

print("\n".join("PASS " + p for p in PASS if not p.startswith("baked")))
print(f"... plus {sum(p.startswith('baked') for p in PASS)} baked-file checks")
print("\n".join("FAIL " + f for f in FAIL))
print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
sys.exit(1 if FAIL else 0)
