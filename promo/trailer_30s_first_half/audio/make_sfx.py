"""予告用SEを合成して audio/se/*.wav に書き出す（48kHz）。外部素材は使わない。

- campfire / wind / water: ゲーム本体 src/systems/OpeningCampfireAudio.ts と同じ構成
  （白色ノイズ→バンドパス: 火620Hz Q0.75 / 風180Hz Q0.3 / 水1050Hz Q0.42、
   1.25秒ごとのパチッ: 三角波1300〜2200Hz・12msで立ち上がり90msで消える）をオフラインで描き直したもの。
   予告用に、火へ短いノイズのはぜ音を少し足している。
- それ以外: このスクリプトで一から合成（ノイズ・正弦波・矩形波・Karplus-Strong）。
すべて本プロジェクトで作ったもので、CC0（パブリックドメイン相当）として扱う。audio/CREDITS.md 参照。
"""
import os

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "se")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(20260927)


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def noise(sec):
    return rng.uniform(-1, 1, int(sec * SR))


def bandpass_webaudio(x, f0, q):
    """Web Audio の BiquadFilter(bandpass) と同じ RBJ 式"""
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b = [alpha, 0, -alpha]
    a = [1 + alpha, -2 * np.cos(w0), 1 - alpha]
    return signal.lfilter(b, a, x)


def lp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x)


def env_exp(n, attack, decay):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(attack, 1e-4)) * np.exp(-np.maximum(0, t - attack) / decay)
    return e


def reverb(x, sec=1.2, mix=0.25):
    ir = rng.uniform(-1, 1, int(sec * SR)) * np.exp(-np.arange(int(sec * SR)) / (SR * sec / 5))
    ir = lp(ir, 6000)
    wet = signal.fftconvolve(x, ir)[: len(x) + len(ir)]
    wet = wet / (np.abs(wet).max() + 1e-9) * np.abs(x).max()
    out = np.zeros(len(wet))
    out[: len(x)] += x * (1 - mix)
    out += wet * mix
    return out


def norm(x, peak=0.9):
    return x / (np.abs(x).max() + 1e-9) * peak


def save(name, x):
    x = norm(x)
    # 端のクリック防止
    f = min(len(x) // 4, int(0.004 * SR))
    x[:f] *= np.linspace(0, 1, f)
    x[-f:] *= np.linspace(1, 0, f)
    sf.write(os.path.join(OUT, f"{name}.wav"), x.astype(np.float32), SR, subtype="PCM_24")
    print(name, f"{len(x) / SR:.2f}s")


# ── ゲームと同じ構成の環境音（ループ用に長めに作る） ──
def game_noise_layer(sec, f0, q, gain):
    return bandpass_webaudio(noise(sec), f0, q) * gain


def campfire(sec=6.0):
    x = game_noise_layer(sec, 620, 0.75, 0.055)
    n = len(x)
    # ゲームのパチッ（1.25秒ごと）
    for start in np.arange(0.05, sec, 1.25):
        f = 1300 + rng.uniform(0, 900)
        tt = t_(0.1)
        tri = signal.sawtooth(2 * np.pi * f * tt, 0.5)
        e = np.where(tt < 0.012, 0.0001 * (0.018 / 0.0001) ** (tt / 0.012), 0.018 * (0.0001 / 0.018) ** ((tt - 0.012) / 0.078))
        i = int(start * SR)
        seg = (tri * e)[: n - i]
        x[i : i + len(seg)] += seg
    # 予告用に足す、はぜる音（短いノイズの粒）
    for _ in range(int(sec * 7)):
        i = int(rng.uniform(0, sec - 0.05) * SR)
        m = int(rng.uniform(0.004, 0.02) * SR)
        g = rng.uniform(0.01, 0.05)
        pop = hp(rng.uniform(-1, 1, m), 1500) * env_exp(m, 0.0005, m / SR / 4) * g
        x[i : i + m] += pop
    return x * 0.58


def wind(sec=6.0):
    x = game_noise_layer(sec, 180, 0.3, 0.012)
    lfo = 0.65 + 0.35 * np.sin(2 * np.pi * 0.23 * t_(sec) + 1.3)
    return x * lfo * 0.58


def water(sec=3.0):
    x = game_noise_layer(sec, 1050, 0.42, 0.011)
    # 水面のきらめき（細かい高音の粒）
    for _ in range(int(sec * 20)):
        i = int(rng.uniform(0, sec - 0.03) * SR)
        f = rng.uniform(1800, 3400)
        tt = t_(0.03)
        x[i : i + len(tt)] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.008) * 0.004
    return x * 0.58


# ── 合成SE ──
def digital_noise():
    sec = 0.32
    n = int(sec * SR)
    x = np.zeros(n)
    hold = int(SR / 900)
    vals = rng.uniform(-1, 1, n // hold + 1).repeat(hold)[:n]
    x += np.round(vals * 4) / 4 * 0.6  # ビットクラッシュ
    tt = t_(sec)
    x += signal.square(2 * np.pi * np.where(tt < 0.1, 1200, 380) * tt) * 0.25
    gate = (rng.uniform(0, 1, n // 400 + 1) > 0.35).repeat(400)[:n]
    return x * gate * env_exp(n, 0.002, 0.2)


def type_blip(freq, sec):
    tt = t_(sec)
    return signal.square(2 * np.pi * freq * tt, 0.5) * np.exp(-tt / (sec / 3)) * 0.5


def riser():
    sec = 3.0
    tt = t_(sec)
    p = tt / sec
    nz = noise(sec)
    # 中心周波数が上がるノイズ（区間ごとにフィルタ）
    out = np.zeros_like(nz)
    blk = 2048
    for i in range(0, len(nz), blk):
        fc = 200 * (4000 / 200) ** (i / len(nz))
        out[i : i + blk] = bandpass_webaudio(nz[max(0, i - 4096) : i + blk], fc, 1.2)[-len(nz[i : i + blk]) :]
    tone = np.sin(2 * np.pi * np.cumsum(110 * (8 ** p)) / SR) * 0.35
    return (out * 2.5 + tone) * (p**2.2)


def whoosh():
    sec = 0.7
    tt = t_(sec)
    nz = noise(sec)
    out = np.zeros_like(nz)
    blk = 1024
    for i in range(0, len(nz), blk):
        ph = i / len(nz)
        fc = 400 + 2600 * np.sin(np.pi * ph)
        out[i : i + blk] = bandpass_webaudio(nz[max(0, i - 2048) : i + blk], fc, 0.9)[-len(nz[i : i + blk]) :]
    return out * np.sin(np.pi * np.clip(tt / sec, 0, 1)) ** 1.5


def boom(sec=1.6, f_start=70, f_end=38, crunch=0.35):
    tt = t_(sec)
    f = f_end + (f_start - f_end) * np.exp(-tt / 0.12)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.55)
    click = lp(noise(sec), 3000) * np.exp(-tt / 0.03) * 0.8
    crunch_n = lp(noise(sec), 900) * np.exp(-tt / 0.25) * crunch
    return np.tanh((body + click + crunch_n) * 1.6)


def snap():
    sec = 0.09
    tt = t_(sec)
    return hp(noise(sec), 2500) * np.exp(-tt / 0.012) + np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt / 0.02) * 0.4


def flash_hit():
    sec = 0.45
    tt = t_(sec)
    return hp(noise(sec), 3500) * np.exp(-tt / 0.06) * 0.8 + np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt / 0.12) * 0.5


def impact():
    x = boom(1.8, 90, 32, 0.6)
    tt = t_(1.8)
    crash = lp(noise(1.8), 5000) * np.exp(-tt / 0.35) * 0.5
    return reverb(np.tanh((x + crash) * 1.4), 1.0, 0.2)


def bow():
    """Karplus-Strong で弓の弦（はじく音）"""
    sec = 0.9
    f0 = 196.0
    N = int(SR / f0)
    buf = rng.uniform(-1, 1, N)
    out = np.zeros(int(sec * SR))
    for i in range(len(out)):
        out[i] = buf[i % N]
        buf[i % N] = 0.996 * 0.5 * (buf[i % N] + buf[(i + 1) % N])
    tt = t_(sec)
    thump = np.sin(2 * np.pi * 90 * tt) * np.exp(-tt / 0.05) * 0.6
    swish = hp(noise(sec), 4000) * np.exp(-((tt - 0.05) ** 2) / 0.0008) * 0.25
    return out + thump + swish


def explosion():
    sec = 0.9
    tt = t_(sec)
    body = lp(noise(sec), 1200) * np.exp(-tt / 0.22)
    thump = np.sin(2 * np.pi * np.cumsum(60 + 80 * np.exp(-tt / 0.05)) / SR) * np.exp(-tt / 0.3)
    return np.tanh((body * 1.2 + thump) * 1.5)


def rumble():
    sec = 1.4
    tt = t_(sec)
    x = lp(noise(sec), 140, 4) * 6
    grains = lp(noise(sec), 2500) * (rng.uniform(0, 1, len(tt)) > 0.9985).astype(float).cumsum() % 2 * 0.15
    return (x + grains) * np.minimum(1, tt / 0.15) * np.exp(-np.maximum(0, tt - 0.6) / 0.5)


def sparkle():
    sec = 1.6
    out = np.zeros(int(sec * SR))
    notes = [2093.0, 2637.0, 3136.0, 4186.0, 3136.0, 5274.0]  # C7 E7 G7 C8 …（鈴のような高音）
    for k, f in enumerate(notes):
        start = int(k * 0.07 * SR)
        tt = t_(sec - k * 0.07)
        tone = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt / 0.35) * 0.4
        out[start : start + len(tone)] += tone
    return reverb(out, 1.4, 0.35)


def join():
    """加入ジングル風（オリジナルの短い上昇アルペジオ）。既存作品の旋律は使わない"""
    bpm_step = 0.085
    seq = [(392.0, 1), (523.25, 1), (659.25, 1), (783.99, 1), (1046.5, 5)]  # G4 C5 E5 G5 C6
    total = sum(d for _, d in seq) * bpm_step + 0.5
    out = np.zeros(int(total * SR))
    pos = 0.0
    for f, d in seq:
        dur = d * bpm_step
        tt = t_(dur + 0.25)
        tone = signal.square(2 * np.pi * f * tt, 0.25) * 0.3 + signal.sawtooth(2 * np.pi * f / 2 * tt, 0.5) * 0.18
        e = np.exp(-np.maximum(0, tt - dur) / 0.06) * (0.85 + 0.15 * np.exp(-tt / 0.05))
        i = int(pos * SR)
        seg = (tone * e)[: len(out) - i]
        out[i : i + len(seg)] += seg
        pos += dur
    return reverb(lp(out, 7000), 0.8, 0.18)


def impact_logo():
    x = impact()
    sec = 3.2
    out = np.zeros(int(sec * SR))
    out[: len(x)] += x
    # きらめく余韻
    s = sparkle()
    out[int(0.08 * SR) : int(0.08 * SR) + len(s)] += s[: len(out) - int(0.08 * SR)] * 0.35
    return reverb(out, 2.2, 0.3)


if __name__ == "__main__":
    save("campfire", campfire())
    save("wind", wind())
    save("water", water())
    save("digital_noise", digital_noise())
    save("type", type_blip(880, 0.035))
    save("type_hi", type_blip(1320, 0.025))
    save("riser", riser())
    save("whoosh", whoosh())
    save("boom", boom())
    save("snap", snap())
    save("flash_hit", flash_hit())
    save("impact", impact())
    save("bow", bow())
    save("explosion", explosion())
    save("rumble", rumble())
    save("sparkle", sparkle())
    save("join", join())
    save("impact_logo", impact_logo())
