#!/usr/bin/env python3
"""Procedurally synthesise every sound effect (no samples, no licences needed: original work).

Usage: python src/audio/make_sfx.py [--out assets/audio/sfx]
Each effect is a small function returning mono or stereo float audio at 48 kHz.
"""
import argparse
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from audiolib import (SR, adsr, bandpass, highpass, lowpass, noise, reverb, t_axis, write_wav)  # noqa: E402


def env_exp(n, rate):
    return np.exp(-np.arange(n) / SR * rate)


def click(seed, f_lo=1500, f_hi=5000, dur=0.03):
    n = int(dur * SR)
    return bandpass(noise(n, seed), f_lo, f_hi) * env_exp(n, 120)


def thump(f=70, dur=0.35, drop=2.0):
    t = t_axis(dur)
    ph = 2 * np.pi * np.cumsum(f * (1 + drop * np.exp(-t * 30))) / SR
    return np.sin(ph) * env_exp(len(t), 9)


def scatter(total, count, seed, maker, gain_decay=2.0):
    out = np.zeros(int(total * SR), np.float32)
    rng = np.random.default_rng(seed)
    times = np.sort(rng.random(count) ** 1.6 * total * 0.9)
    for i, tt in enumerate(times):
        c = maker(seed * 100 + i, rng)
        a = int(tt * SR)
        b = min(len(out), a + len(c))
        out[a:b] += c[:b - a] * np.exp(-tt * gain_decay) * (0.5 + rng.random() * 0.5)
    return out


def rock_click(s, rng):
    f = 600 + rng.random() * 2600
    return click(s, f, f * 2.2, 0.02 + rng.random() * 0.05) * 0.8


def sweep_sine(f0, f1, dur, shape="exp"):
    t = t_axis(dur)
    k = t / dur
    f = f0 * (f1 / f0) ** k if shape == "exp" else f0 + (f1 - f0) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ---------------- effects ----------------

def wind():
    n = int(13 * SR)
    t = np.arange(n) / SR
    lfo = 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t) * np.sin(2 * np.pi * 0.047 * t + 1)
    l = bandpass(noise(n, 1), 180, 900) * lfo
    r = bandpass(noise(n, 2), 200, 1000) * lfo[::-1]
    fade = np.minimum(1, np.minimum(t / 2, (13 - t) / 2))
    return np.stack([l, r], 1) * fade[:, None] * 0.5


def debris_far():
    n = int(4 * SR)
    rum = lowpass(noise(n, 3), 120) * adsr(n, 0.8, 1.0, 0.6, 2.0) * 3
    clicks = scatter(4, 25, 4, rock_click, 0.3) * 0.4
    return reverb(rum + clicks, 1.8, 0.5)


def whoosh_small():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    x = noise(n, 5)
    lo = bandpass(x, 400, 1500) * np.sin(np.pi * t / 0.35) ** 2
    hi = bandpass(x, 1500, 5000) * np.sin(np.pi * np.clip(t / 0.35 * 1.2 - 0.1, 0, 1)) ** 2
    return lo * 0.7 + hi * 0.5


def rubble_kick():
    n = int(1.2 * SR)
    out = np.zeros(n, np.float32)
    th = thump(60, 0.5, 1.5) * 0.9
    out[:len(th)] += th
    crunch = bandpass(noise(int(0.25 * SR), 6), 300, 3000) * env_exp(int(0.25 * SR), 18)
    out[:len(crunch)] += crunch * 0.8
    out += scatter(1.2, 18, 7, rock_click, 2.5) * 0.7
    return reverb(out, 1.0, 0.18)


def rubble_roll():
    def clack(s, rng):
        f = 350 + rng.random() * 900
        c = click(s, f, f * 3, 0.06) * 0.9
        return c
    out = scatter(2.4, 20, 8, clack, 1.4)
    return reverb(out, 1.2, 0.25)


def surprise():
    t = t_axis(0.28)
    f = 500 * (2.6 ** (t / 0.28)) * (1 + 0.03 * np.sin(2 * np.pi * 30 * t))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(len(t), 0.005, 0.05, 0.7, 0.12)
    return x * 0.35


def metal_clang():
    dur = 1.6
    t = t_axis(dur)
    f0 = 380
    x = np.zeros_like(t)
    for ratio, amp, dec in [(1, 1, 4), (2.76, 0.6, 6), (5.4, 0.4, 9), (8.93, 0.25, 14), (13.3, 0.15, 20)]:
        x += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t * dec)
    hit = highpass(noise(len(t), 9), 1500) * env_exp(len(t), 60) * 0.8
    th = np.zeros_like(t)
    tp = thump(90, 0.3, 1.0)
    th[:len(tp)] = tp
    return reverb((x * 0.35 + hit + th * 0.6).astype(np.float32), 1.4, 0.25)


def debris_burst():
    n = int(2.0 * SR)
    boom = np.zeros(n, np.float32)
    tb = thump(45, 1.2, 2.5)
    boom[:len(tb)] = tb
    blast = lowpass(noise(n, 10), 1800) * env_exp(n, 4.5) * 1.2
    clicks = scatter(2.0, 40, 11, rock_click, 1.2) * 0.8
    return reverb(boom * 0.9 + blast * 0.6 + clicks, 1.5, 0.22)


def servo():
    dur = 0.6
    t = t_axis(dur)
    f = 520 + 520 * np.sin(np.pi * t / dur * 0.5)
    car = np.sin(2 * np.pi * np.cumsum(f) / SR + 2.5 * np.sin(2 * np.pi * 2 * np.cumsum(f) / SR))
    x = car * adsr(len(t), 0.03, 0.1, 0.8, 0.15) * 0.25
    c = click(12, 2000, 6000, 0.03)
    x[:len(c)] += c * 0.5
    return x


def boing():
    t = t_axis(0.6)
    f = 220 * (1 + 0.6 * np.exp(-t * 6) * np.sin(2 * np.pi * 14 * t)) * (1 + t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(t), 5) * 0.35


def robot_droop():
    x = sweep_sine(900, 260, 0.8) * adsr(int(0.8 * SR), 0.02, 0.2, 0.7, 0.3)
    buzz = np.sign(x) * 0.15
    return (x * 0.25 + buzz * 0.08) * 0.9


def tsukkomi():
    """Harisen-style slap: crisp paper crack + body thump + tiny comic 'pikon'."""
    n = int(0.5 * SR)
    out = np.zeros(n, np.float32)
    crack = highpass(noise(int(0.09 * SR), 13), 1200) * env_exp(int(0.09 * SR), 45)
    out[:len(crack)] += crack * 1.2
    tp = thump(110, 0.25, 0.8)
    out[:len(tp)] += tp * 0.7
    pk = sweep_sine(1400, 2100, 0.12) * env_exp(int(0.12 * SR), 18) * 0.25
    a = int(0.05 * SR)
    out[a:a + len(pk)] += pk
    return reverb(out, 0.6, 0.12)


def hangar_door():
    dur = 2.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    rum = lowpass(noise(n, 14), 110) * adsr(n, 0.3, 0.4, 0.8, 0.6) * 4
    creak_f = 170 + 25 * np.sin(2 * np.pi * 0.9 * t) + 12 * noise(n, 15) * 0.05
    creak = np.sin(2 * np.pi * np.cumsum(creak_f) / SR)
    creak = bandpass(np.sign(creak) * np.abs(creak) ** 0.3, 150, 2500) * adsr(n, 0.2, 0.5, 0.5, 0.8) * 0.12
    clunk = np.zeros(n, np.float32)
    tb = thump(55, 0.6, 1.0)
    a = int(2.1 * SR)
    clunk[a:a + len(tb)] = tb[:n - a]
    return reverb(rum * 0.6 + creak + clunk * 0.9, 2.5, 0.35)


def lights_on():
    dur = 3.2
    n = int(dur * SR)
    out = np.zeros(n, np.float32)
    for i, tt in enumerate([0.0, 0.32, 0.62, 0.9, 1.15]):
        k = thump(80 - i * 6, 0.4, 0.6) * 0.8
        c = click(20 + i, 800, 3000, 0.05)
        a = int(tt * SR)
        out[a:a + len(k)] += k
        out[a:a + len(c)] += c * 0.6
    t = np.arange(n) / SR
    hum = sum(np.sin(2 * np.pi * f * t) / (j + 1) for j, f in enumerate([60, 120, 180, 240]))
    hum *= np.clip((t - 0.3) / 1.8, 0, 1) * 0.12 * np.clip((dur - t) / 0.6, 0, 1)
    return reverb(out + hum, 2.2, 0.3)


def power_hum():
    dur = 2.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 80 + 140 * (t / dur) ** 0.7
    x = sum(np.sin(2 * np.pi * np.cumsum(f * m) / SR) / m for m in (1, 2, 3, 4))
    return reverb(x * adsr(n, 0.6, 0.5, 0.8, 0.8) * 0.15, 1.8, 0.35)


def shimmer():
    dur = 2.2
    out = np.zeros(int(dur * SR), np.float32)
    rng = np.random.default_rng(16)
    notes = [1568, 2093, 2349, 2637, 3136, 3520, 4186]
    for i in range(14):
        f = notes[rng.integers(len(notes))]
        tt = i * 0.09 + rng.random() * 0.03
        t = t_axis(0.9)
        b = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 5)
        a = int(tt * SR)
        out[a:a + len(b)] += b[:len(out) - a] * 0.12 * (1 - i / 16)
    return reverb(out, 2.0, 0.45)


def engine_fail():
    dur = 2.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    rate = 14 * (1 - 0.7 * t / dur)  # sputter pulses slowing down
    ph = np.cumsum(rate) / SR
    pulses = (np.sin(2 * np.pi * ph) > 0.6).astype(np.float32)
    rng = np.random.default_rng(17)
    gate = pulses * (rng.random(n) > 0.0004)
    eng = lowpass(noise(n, 18), 300) * gate * 3
    whir = sweep_sine(420, 90, dur) * np.exp(-t * 0.8) * 0.15
    pop = np.zeros(n, np.float32)
    for tt in (0.9, 1.7, 2.3):
        a = int(tt * SR)
        b = (thump(70, 0.25, 2.0) * 0.8 + highpass(noise(int(0.25 * SR), int(tt * 10)), 800) * env_exp(int(0.25 * SR), 25) * 0.5)
        pop[a:a + len(b)] += b[:n - a]
    hiss = highpass(noise(n, 19), 3000) * np.clip((t - 1.8) / 0.3, 0, 1) * np.exp(-(t - 1.8).clip(0) * 1.5) * 0.25
    return reverb(eng * 0.5 + whir + pop + hiss, 1.4, 0.25)


def sparks():
    dur = 1.0

    def zap(s, rng):
        c = highpass(noise(int(0.012 * SR), s), 2500) * env_exp(int(0.012 * SR), 300)
        return c * 1.2
    x = scatter(dur, 45, 20, zap, 2.0)
    sizzle = highpass(noise(int(dur * SR), 21), 5000) * env_exp(int(dur * SR), 4) * 0.12
    return reverb(x + sizzle, 0.8, 0.15)


def blip():
    x = sweep_sine(900, 1700, 0.14) * adsr(int(0.14 * SR), 0.005, 0.03, 0.8, 0.05)
    return x * 0.25


def fist_pump():
    w = whoosh_small() * 0.6
    ch = shimmer()[: int(1.2 * SR)]
    out = np.zeros((int(1.3 * SR), 2), np.float32)
    out[:len(w)] += np.stack([w, w], 1)
    a = int(0.15 * SR)
    out[a:a + len(ch)] += ch[: len(out) - a] * 0.8
    return out


EFFECTS = {f.__name__: f for f in [wind, debris_far, whoosh_small, rubble_kick, rubble_roll, surprise, metal_clang,
                                   debris_burst, servo, boing, robot_droop, tsukkomi, hangar_door, lights_on, power_hum,
                                   shimmer, engine_fail, sparks, blip, fist_pump]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="assets/audio/sfx")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    for name, fn in EFFECTS.items():
        x = np.asarray(fn(), np.float32)
        x = x / max(1e-6, np.abs(x).max()) * 0.9
        write_wav(os.path.join(a.out, f"{name}.wav"), x)
        print(f"{name:14s} {len(x) / SR:5.2f}s")


if __name__ == "__main__":
    main()
