#!/usr/bin/env python3
"""Synthesize every line in project/timeline.json with a local VOICEVOX engine.

Outputs (per line):  assets/audio/voice/<line_id>.wav   (48 kHz mono, 16-bit)
Summary:             assets/audio/voice/voice_index.json  (duration + 30 fps mouth envelope)

Only the local engine is used. If it is not running the script stops; it never
falls back to an online or paid service.

Usage: python src/audio/synth_voices.py [--project project] [--only id1,id2] [--force]
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.parse
import urllib.request

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from audiolib import SR, read_wav, write_wav, resample, robot_fx, trim_silence, envelope  # noqa: E402


def post(url, data=None):
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json"} if data else {})
    return urllib.request.urlopen(req, timeout=120).read()


def synth(base, text, sp, style_id):
    q = json.loads(post(f"{base}/audio_query?" + urllib.parse.urlencode({"text": text, "speaker": style_id})))
    for k in ("speedScale", "pitchScale", "intonationScale", "volumeScale"):
        if k in sp:
            q[k] = sp[k]
    q["prePhonemeLength"] = 0.05
    q["postPhonemeLength"] = 0.08
    q["outputSamplingRate"] = SR
    return post(f"{base}/synthesis?speaker={style_id}", json.dumps(q).encode())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default="project")
    ap.add_argument("--out", default="assets/audio/voice")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    vc = json.load(open(os.path.join(a.project, "voice_config.json"), encoding="utf-8"))
    tl = json.load(open(os.path.join(a.project, "timeline.json"), encoding="utf-8"))
    base = vc["url"]
    try:
        urllib.request.urlopen(f"{base}/version", timeout=5)
    except Exception:
        sys.exit(f"VOICEVOX engine not reachable at {base}. Start it first (see README).")

    os.makedirs(a.out, exist_ok=True)
    index_path = os.path.join(a.out, "voice_index.json")
    index = json.load(open(index_path)) if os.path.exists(index_path) else {}
    only = set(filter(None, a.only.split(",")))

    for scene in tl["scenes"]:
        for line in scene["lines"]:
            lid = line["id"]
            if only and lid not in only:
                continue
            sp = dict(vc["speakers"][line["speaker"]])
            sp.update(line.get("voice", {}))
            style_id = sp["styles"].get(line["style"], sp["id"]) if line.get("style") else sp["id"]
            text = line.get("tts", line["text"])
            key = hashlib.sha1(json.dumps([text, style_id, sp, vc["engineVersion"]], sort_keys=True,
                                          ensure_ascii=False).encode()).hexdigest()[:12]
            path = os.path.join(a.out, f"{lid}.wav")
            if not a.force and index.get(lid, {}).get("key") == key and os.path.exists(path):
                continue
            raw = os.path.join(a.out, f"{lid}.raw.wav")
            open(raw, "wb").write(synth(base, text, sp, style_id))
            x, sr = read_wav(raw)
            os.remove(raw)
            x = resample(x, sr, SR)
            if "robot" in sp.get("fx", {}):
                x = robot_fx(x, **sp["fx"]["robot"])
            x = trim_silence(x)
            x = x / max(1e-6, np.abs(x).max()) * 0.89
            write_wav(path, x)
            index[lid] = {"key": key, "speaker": line["speaker"], "style": style_id,
                          "duration": round(len(x) / SR, 3), "envelope": envelope(x)}
            print(f"{lid:8s} {len(x) / SR:5.2f}s  {text}")
    json.dump(index, open(index_path, "w"), ensure_ascii=False)


if __name__ == "__main__":
    main()
