#!/usr/bin/env python3
"""Compose the three BGM cues procedurally (original work, no samples, no licences).

A: lonely - soft piano arpeggios + space pad (A minor, slow)
B: comic  - pizzicato bass, marimba hook, woodblock & shaker (C major, 124 bpm, leaves room for gags)
C: epic   - dark drone -> timpani hit -> brass/strings theme (D major), calm middle, finale swell
Lengths and section markers come from project/timeline.json "music" cues.

Usage: python src/audio/make_music.py [--project project] [--out assets/audio/bgm]
"""
import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from audiolib import SR, adsr, highpass, lowpass, midi_hz, noise, reverb, t_axis, write_wav  # noqa: E402

NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def m(name):  # "A4" -> midi
    return 12 * (int(name[-1]) + 1) + NOTE[name[:-1]]


# ---------------- instruments ----------------

def piano(f, dur, vel=0.6):
    t = t_axis(dur)
    x = np.zeros_like(t)
    B = 0.0004
    for n in range(1, 9):
        fn = f * n * np.sqrt(1 + B * n * n)
        x += np.sin(2 * np.pi * fn * t) / n ** 1.3 * np.exp(-t * (0.9 + 0.55 * n) * (1 + f / 2000))
    x *= np.minimum(1, t / 0.004)
    hammer = lowpass(noise(len(t), int(f)), 3000) * np.exp(-t * 80) * 0.05
    return (x + hammer) * vel


def pad(f, dur, bright=6, att=1.2, rel=1.5, detune=0.004):
    t = t_axis(dur)
    x = np.zeros_like(t)
    for d in (-detune, 0, detune):
        for n in range(1, bright + 1):
            x += np.sin(2 * np.pi * f * (1 + d) * n * t + n * d * 100) / n ** 1.6
    vib = 1 + 0.15 * np.sin(2 * np.pi * 0.3 * t)
    return x * adsr(len(t), att, 0.3, 0.85, rel) * vib / 3


def pluck(f, dur, vel=0.7):
    t = t_axis(dur)
    x = sum(np.sin(2 * np.pi * f * n * t) / n * np.exp(-t * (6 + 5 * n)) for n in range(1, 7))
    return x * np.minimum(1, t / 0.002) * vel


def marimba(f, dur=0.6, vel=0.6):
    t = t_axis(dur)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 22)
    x += 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 45)
    return x * np.minimum(1, t / 0.002) * vel


def brass(f, dur, vel=0.6):
    t = t_axis(dur)
    env = adsr(len(t), 0.08, 0.25, 0.75, 0.35)
    bright = 2 + 9 * env
    x = np.zeros_like(t)
    for d in (-0.003, 0.003):
        for n in range(1, 16):
            x += np.sin(2 * np.pi * f * (1 + d) * n * t) / n * np.exp(-n / bright)
    return x * env * vel * (1 + 0.04 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t - 0.3, 0, 1))


def strings(f, dur, vel=0.5):
    return pad(f, dur, bright=10, att=0.5, rel=0.9, detune=0.006) * vel


def bell(f, dur=2.0, vel=0.4):
    t = t_axis(dur)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in [(1, 1, 2), (2.0, 0.5, 3), (2.76, 0.4, 4), (5.4, 0.2, 7)])
    return x * np.minimum(1, t / 0.002) * vel


def timpani(f=73.4, dur=1.6, vel=1.0):
    t = t_axis(dur)
    ff = f * (1 + 0.25 * np.exp(-t * 25))
    x = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 2.5)
    x += 0.5 * np.sin(2 * np.pi * np.cumsum(ff * 1.5) / SR) * np.exp(-t * 4)
    x += lowpass(noise(len(t), 5), 600) * np.exp(-t * 30) * 0.6
    return x * vel


def cymbal(dur=2.0, swell=False, vel=0.3):
    t = t_axis(dur)
    x = highpass(noise(len(t), 77), 5000)
    env = (t / dur) ** 3 if swell else np.exp(-t * 2.2)
    return x * env * vel


def woodblock(vel=0.4):
    t = t_axis(0.08)
    return (np.sin(2 * np.pi * 900 * t) + 0.5 * np.sin(2 * np.pi * 2300 * t)) * np.exp(-t * 70) * vel


def shaker(vel=0.12):
    n = int(0.06 * SR)
    return highpass(noise(n, 3), 6000) * np.sin(np.linspace(0, np.pi, n)) * vel


# ---------------- arrangement helpers ----------------

class Track:
    def __init__(self, dur):
        self.buf = np.zeros(int((dur + 4) * SR), np.float32)
        self.dur = dur

    def add(self, sig, t, gain=1.0):
        a = int(t * SR)
        if a >= len(self.buf) or t < 0:
            return
        b = min(len(self.buf), a + len(sig))
        self.buf[a:b] += sig[:b - a] * gain

    def render(self, rev=2.0, wet=0.3):
        x = reverb(self.buf, rev, wet)
        return x[: int(self.dur * SR)]


def track_A(dur):
    """Lonely piano: Am - F - C - G (each 3.6 s), arpeggio + sparse melody over a space pad."""
    T = Track(dur)
    prog = [["A2", "E3", "A3", "C4", "E4"], ["F2", "C3", "F3", "A3", "C4"], ["C3", "G3", "C4", "E4", "G4"], ["G2", "D3", "G3", "B3", "D4"]]
    bar = 3.6
    mel = {0: "E5", 1.8: "C5", 3.6: "A4", 5.4: "C5", 7.2: "G4", 9.0: "E5", 10.8: "D5", 14.4: "E5", 16.2: "A5", 18.0: "G5"}
    t = 0.0
    i = 0
    while t < dur:
        ch = prog[i % 4]
        T.add(pad(midi_hz(m(ch[0]) + 12), bar + 1.5, 5, 1.5, 1.6) * 0.18, t)
        T.add(pad(midi_hz(m(ch[2])), bar + 1.5, 4, 1.5, 1.6) * 0.12, t)
        for k, nn in enumerate([0, 1, 2, 3, 4, 3, 2, 1]):
            T.add(piano(midi_hz(m(ch[nn])), 2.5, 0.22 if k else 0.3), t + k * bar / 8)
        t += bar
        i += 1
    for tt, nn in mel.items():
        if tt < dur - 1:
            T.add(piano(midi_hz(m(nn)), 3.0, 0.32), tt + 0.02)
    # far shimmer of stars
    for k in range(int(dur / 2.3)):
        T.add(bell(midi_hz(m(["E6", "A6", "B6", "C7"][k % 4])), 2.5, 0.05), 1.0 + k * 2.3)
    return T.render(3.5, 0.45)


def track_B(dur):
    """Comic: bouncy pizzicato bass + marimba hook, 124 bpm, I-vi-IV-V in C."""
    T = Track(dur)
    beat = 60 / 124
    prog = [("C3", ["C5", "E5", "G5", "E5"]), ("A2", ["A4", "C5", "E5", "C5"]), ("F2", ["F4", "A4", "C5", "A4"]), ("G2", ["G4", "B4", "D5", "B4"])]
    hook = ["E5", "G5", None, "E5", "D5", None, "C5", "D5"]
    bars = int(dur / (beat * 4)) + 1
    for b in range(bars):
        root, arp = prog[b % 4]
        t0 = b * beat * 4
        for k in range(4):  # bass: root - fifth bounce
            n = m(root) + (7 if k % 2 else 0) + (12 if k == 3 else 0)
            T.add(pluck(midi_hz(n), 0.4, 0.55), t0 + k * beat)
        for k in range(8):  # marimba 8ths, hook every other bar
            if b % 2 == 0:
                nn = hook[k]
                if nn:
                    T.add(marimba(midi_hz(m(nn)), 0.6, 0.38), t0 + k * beat / 2)
            elif k % 2 == 0:
                T.add(marimba(midi_hz(m(arp[k // 2])), 0.5, 0.25), t0 + k * beat / 2)
        for k in range(4):
            T.add(woodblock(0.18 if k % 2 else 0.12), t0 + k * beat + beat / 2)
            T.add(shaker(0.08), t0 + k * beat + beat / 4)
            T.add(shaker(0.05), t0 + k * beat + 3 * beat / 4)
    return T.render(1.2, 0.18)


def track_C(dur, mk):
    """Epic & bright, D major. Markers: hit, theme, calm, finale (seconds from cue start)."""
    T = Track(dur)
    hit, theme, calm, finale = mk["hit"], mk["theme"], mk["calm"], mk["finale"]
    # 0 -> hit: low drone + cymbal swell (darkness)
    T.add(strings(midi_hz(m("D2")), hit + 1.5, 0.35), 0)
    T.add(strings(midi_hz(m("A2")), hit + 1.5, 0.2), 0)
    T.add(cymbal(hit, swell=True, vel=0.25), 0)
    T.add(timpani(73.4, 2.0, 1.0), hit)
    T.add(cymbal(2.5, vel=0.18), hit)
    # hit -> theme: rising strings, timpani roll
    T.add(strings(midi_hz(m("D3")), theme - hit + 1, 0.3), hit)
    T.add(strings(midi_hz(m("F#3")), theme - hit + 1, 0.22), hit + 0.8)
    T.add(strings(midi_hz(m("A3")), theme - hit + 1, 0.22), hit + 1.6)
    for k in range(int((theme - hit) / 0.12)):
        T.add(timpani(110, 0.4, 0.15 + 0.5 * k * 0.12 / (theme - hit)), hit + 0.4 + k * 0.12)
    T.add(cymbal(theme - hit, swell=True, vel=0.3), hit)

    prog = [("D", ["D3", "F#3", "A3", "D4"]), ("A", ["A2", "E3", "A3", "C#4"]), ("Bm", ["B2", "F#3", "B3", "D4"]), ("G", ["G2", "D3", "G3", "B3"])]
    theme_mel = ["F#5", "A5", "D6", "C#6", "B5", "A5", "B5", "G5"]

    def big_section(t0, t1, intensity):
        bar = 2.0
        b = 0
        t = t0
        while t < t1 - 0.5:
            name, ch = prog[b % 4]
            L = min(bar, t1 - t) + 0.6
            for j, nn in enumerate(ch):
                T.add(brass(midi_hz(m(nn)), L, 0.16 * intensity), t)
                T.add(strings(midi_hz(m(nn) + 12), L, 0.12 * intensity), t)
            T.add(strings(midi_hz(m(ch[0]) - 12), L, 0.25 * intensity), t)
            T.add(timpani(midi_hz(m(ch[0]) - 12), 1.4, 0.7 * intensity), t)
            T.add(timpani(midi_hz(m(ch[0]) - 12), 1.0, 0.4 * intensity), t + 1.0)
            for k in range(2):
                mi = (b * 2 + k) % len(theme_mel)
                T.add(brass(midi_hz(m(theme_mel[mi])), 1.1, 0.14 * intensity), t + k * 1.0)
                T.add(bell(midi_hz(m(theme_mel[mi]) + 12), 1.5, 0.06 * intensity), t + k * 1.0)
            t += bar
            b += 1

    big_section(theme, calm, 1.0)
    T.add(cymbal(2.0, vel=0.25), theme)
    # calm: soft strings + piano (engine broken, the promise)
    t = calm
    b = 0
    while t < finale - 0.5:
        name, ch = prog[(b + 2) % 4]
        L = min(4.0, finale - t) + 1.0
        T.add(strings(midi_hz(m(ch[0])), L, 0.16), t)
        T.add(strings(midi_hz(m(ch[2])), L, 0.1), t)
        for k, nn in enumerate([0, 1, 2, 3, 2, 1, 2, 3]):
            T.add(piano(midi_hz(m(ch[nn]) + 12), 2.0, 0.14), t + k * 0.5)
        t += 4.0
        b += 1
    # finale
    T.add(cymbal(1.6, swell=True, vel=0.3), finale - 1.6)
    T.add(timpani(73.4, 2.0, 1.0), finale)
    big_section(finale, dur - 3.0, 1.15)
    for nn in ["D3", "F#3", "A3", "D4", "F#4", "A4"]:  # last chord rings out
        T.add(brass(midi_hz(m(nn)), 3.2, 0.13), dur - 3.4)
        T.add(strings(midi_hz(m(nn) + 12), 3.4, 0.1), dur - 3.4)
    T.add(timpani(73.4, 2.5, 0.9), dur - 3.4)
    T.add(bell(midi_hz(m("D6")), 3.0, 0.12), dur - 3.4)
    return T.render(2.6, 0.32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default="project")
    ap.add_argument("--out", default="assets/audio/bgm")
    a = ap.parse_args()
    tl = json.load(open(os.path.join(a.project, "timeline.json"), encoding="utf-8"))
    os.makedirs(a.out, exist_ok=True)
    for cue in tl["music"]:
        dur = cue["t1"] - cue["t0"]
        if cue["track"] == "A":
            x = track_A(dur)
        elif cue["track"] == "B":
            x = track_B(dur)
        else:
            x = track_C(dur, cue["markers"])
        x = x / max(1e-6, np.abs(x).max()) * 0.9
        write_wav(os.path.join(a.out, f"bgm_{cue['track']}.wav"), x)
        print(f"bgm_{cue['track']}: {dur:.1f}s")


if __name__ == "__main__":
    main()
