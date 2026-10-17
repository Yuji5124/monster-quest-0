#!/usr/bin/env python3
"""Mix voices + BGM (ducked under dialogue) + SFX from project/timeline.json, write subtitles.

Outputs: output/mix.wav (48 kHz stereo, loudness-normalised with ffmpeg loudnorm, 2 passes)
         output/subtitles.srt
         output/audio_report.json (per-line placement, peaks, voice/BGM ratio)
Usage: python src/audio/mix.py [--project project]
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from audiolib import SR, place, read_wav, read_wav_stereo, reverb, write_wav  # noqa: E402


def db(x):
    return 10 ** (x / 20)


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def smooth_env(active, attack=0.08, release=0.45):
    """One-pole attack/release smoothing of a 0/1 activity curve (sample rate SR/100)."""
    out = np.zeros_like(active)
    a_up, a_dn = np.exp(-1 / (attack * 100)), np.exp(-1 / (release * 100))
    v = 0.0
    for i, x in enumerate(active):
        k = a_up if x > v else a_dn
        v = x + (v - x) * k
        out[i] = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default="project")
    ap.add_argument("--out", default="output")
    a = ap.parse_args()
    tl = json.load(open(os.path.join(a.project, "timeline.json"), encoding="utf-8"))
    vi = json.load(open("assets/audio/voice/voice_index.json"))
    mx = tl.get("mix", {})
    total = sum(sc["dur"] for sc in tl["scenes"])
    n = int((total + 0.5) * SR)
    voice = np.zeros((n, 2), np.float32)
    music = np.zeros((n, 2), np.float32)
    sfx = np.zeros((n, 2), np.float32)
    subs, report = [], {"lines": []}

    t = 0.0
    for sc in tl["scenes"]:
        start = sc.get("start", t)
        t = start + sc["dur"]
        for L in sc["lines"]:
            at = start + L["at"]
            x, _ = read_wav(f"assets/audio/voice/{L['id']}.wav")
            # small room so the voice sits in the scene; narrator a little larger
            wet = 0.16 if L["speaker"] == "narrator" else 0.07
            v = reverb(x, 1.2 if L["speaker"] == "narrator" else 0.6, wet, seed=3)
            pan = {"boy": 0.06, "robo": -0.06}.get(L["speaker"], 0.0)
            v[:, 0] *= 1 - pan
            v[:, 1] *= 1 + pan
            place(voice, v, at, mx.get("voiceGain", 1.0))
            end = at + vi[L["id"]]["duration"]
            subs.append((at, end + 0.15, L["text"], L["speaker"]))
            report["lines"].append({"id": L["id"], "start": round(at, 3), "end": round(end, 3)})
        for s in sc.get("sfx", []):
            x, _ = read_wav(f"assets/audio/sfx/{s['id']}.wav")
            place(sfx, x, start + s["t"], s.get("gain", 1.0) * mx.get("sfxGain", 0.8))

    for cue in tl["music"]:
        st = read_wav_stereo(f"assets/audio/bgm/bgm_{cue['track']}.wav")
        L = len(st)
        tt = np.arange(L) / SR
        fade = np.minimum(1, np.minimum(tt / max(0.01, cue.get("fadeIn", 0.5)), (L / SR - tt) / max(0.01, cue.get("fadeOut", 1.0))))
        place(music, st * fade[:, None], cue["t0"], cue.get("gain", 0.5))

    # sidechain ducking: music dips under any voice line
    hop = SR // 100
    act = np.zeros(n // hop + 1, np.float32)
    for ln in report["lines"]:
        act[int(ln["start"] * 100):int(ln["end"] * 100) + 1] = 1
    env = smooth_env(act)
    duck = 1 + (db(mx.get("duckDb", -9)) - 1) * env
    music *= np.repeat(duck, hop)[:n, None]

    mix = voice + music + sfx
    os.makedirs(a.out, exist_ok=True)
    raw = os.path.join(a.out, "mix_raw.wav")
    write_wav(raw, mix / max(1.0, np.abs(mix).max()))
    # two-pass loudnorm (free ffmpeg filter)
    target = mx.get("masterLufs", -16)
    p1 = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", f"loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                        capture_output=True, text=True).stderr
    meas = json.loads(p1[p1.rindex("{"):p1.rindex("}") + 1])
    af = (f"loudnorm=I={target}:TP=-1.5:LRA=11:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:"
          f"measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", af, "-ar", str(SR), "-c:a", "pcm_s16le",
                    os.path.join(a.out, "mix.wav")], check=True)
    os.remove(raw)

    with open(os.path.join(a.out, "subtitles.srt"), "w", encoding="utf-8") as f:
        names = {"boy": "少年", "robo": "ロボ太", "narrator": "ナレーター"}
        for i, (s, e, text, spk) in enumerate(subs, 1):
            f.write(f"{i}\n{srt_time(s)} --> {srt_time(e)}\n{text}\n\n")
    # simple level report: voice vs music RMS while lines play
    vmask = np.repeat(act, hop)[:n] > 0
    rms = lambda x: float(np.sqrt(np.mean(x[vmask] ** 2)) + 1e-9)
    report.update({"duration": round(total, 3), "loudnorm_input": meas,
                   "voice_over_music_db_during_lines": round(20 * np.log10(rms(voice) / rms(music)), 1)})
    json.dump(report, open(os.path.join(a.out, "audio_report.json"), "w"), ensure_ascii=False, indent=1)
    print(f"mix.wav {total:.2f}s  voice/music during lines: {report['voice_over_music_db_during_lines']} dB  "
          f"input {meas['input_i']} LUFS -> {target}")


if __name__ == "__main__":
    main()
