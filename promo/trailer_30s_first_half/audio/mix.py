"""src/data/timeline.json に従って BGM・SE・環境音を1本にミックスし、-14 LUFS / TP -1dB に整える。
出力: public/audio/trailer_mix.wav（48kHz・ステレオ・30.000秒ちょうど）と audio/mix/mix_report.json
BGM は assets/audio/source/wav/ から直接読む（コピーしない）。
"""
import json
import os

import librosa
import numpy as np
import pyloudnorm as pyln
import soundfile as sf

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
PROMO = os.path.abspath(os.path.join(HERE, ".."))
SR = 48000
FPS = 30
TOTAL = 900
N = TOTAL * SR // FPS  # 1,440,000 サンプル = 30.000秒

tl = json.load(open(os.path.join(PROMO, "src/data/timeline.json"), encoding="utf-8"))
f2s = lambda f: int(round(f * SR / FPS))
db = lambda d: 10 ** (d / 20)


def load(path, mono=True):
    y, _ = librosa.load(path, sr=SR, mono=mono)
    return y


def ramp(n):
    return np.linspace(0, 1, max(1, n))


mix = np.zeros((2, N))

# ── BGM ──
bgm_cfg = tl["bgm"]
song = load(os.path.join(ROOT, bgm_cfg["file"]))
a, b = f2s(bgm_cfg["inFrame"]), f2s(bgm_cfg["stopFrame"])
off = int(round(bgm_cfg["songOffsetSec"] * SR))
seg = song[off : off + (b - a)].copy()
g = np.ones(len(seg))
r3 = int(0.003 * SR)
for d in bgm_cfg.get("dropout", []):  # C07③の直後：2fだけ抜く
    i0, i1 = f2s(d["from"]) - a, f2s(d["to"]) - a
    g[i0:i1] = 0
    g[i0 - r3 : i0] = np.minimum(g[i0 - r3 : i0], 1 - ramp(r3))
    g[i1 : i1 + r3] = np.minimum(g[i1 : i1 + r3], ramp(r3))
for d in bgm_cfg.get("duck", []):  # C12：少し薄く
    i0, i1 = f2s(d["from"]) - a, f2s(d["to"]) - a
    k = db(d["db"])
    rr = int(0.08 * SR)
    g[i0:i1] *= k
    g[i0 - rr : i0] *= 1 - (1 - k) * ramp(rr)
    g[i1 : i1 + rr] *= k + (1 - k) * ramp(rr)
g[-r3:] *= 1 - ramp(r3)  # f765でぶつ切り（クリック防止の3msだけ）
seg *= g
mix[:, a : a + len(seg)] += seg * db(-3)

# ── SE ──
se_cache = {}


def se(name):
    if name not in se_cache:
        se_cache[name] = load(os.path.join(HERE, "se", f"{name}.wav"))
    return se_cache[name]


def place(x, start, gain_db, pan=0.0):
    i = f2s(start)
    if i >= N:
        return
    x = x[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[0, i : i + len(x)] += x * db(gain_db) * l * np.sqrt(2)
    mix[1, i : i + len(x)] += x * db(gain_db) * r * np.sqrt(2)


def loop_to(x, n):
    reps = int(np.ceil(n / len(x)))
    return np.tile(x, reps)[:n]


events = []
for ev in tl["sfx"]:
    name = ev["id"]
    if "chars" in ev:
        c = ev["chars"]
        for k in range(c["count"]):
            place(se(name), c["from"] + k * c["every"], ev["gain"], pan=0.0)
        events.append({"id": name, "frames": [c["from"] + k * c["every"] for k in range(c["count"])]})
        continue
    x = se(name)
    if "until" in ev:
        n = f2s(ev["until"]) - f2s(ev["at"])
        x = loop_to(x, n).copy()
        fi, fo = f2s(ev.get("fadeIn", 0)), f2s(ev.get("fadeOut", 0))
        if fi:
            x[:fi] *= ramp(fi)
        if fo:
            x[-fo:] *= 1 - ramp(fo)
    pan = {"explosion": -0.25, "snap": 0.2, "sparkle": 0.15}.get(name, 0.0)
    place(x, ev["at"], ev["gain"], pan)
    events.append({"id": name, "at": ev["at"]})

# ── ラウドネス: -14 LUFS / トゥルーピーク -1 dBTP（簡易: 4倍オーバーサンプルで測る） ──
meter = pyln.Meter(SR)
target = tl["loudness"]["targetLUFS"]
tp_limit = db(tl["loudness"]["truePeakDb"])


def true_peak(x):
    up = librosa.resample(x, orig_sr=SR, target_sr=SR * 4, axis=-1)
    return np.abs(up).max()


def limiter(x, ceiling, release=0.05):
    """先読みなしの簡易リミッタ（ピークを超えた分だけゲインを下げ、ゆっくり戻す）"""
    peak = np.abs(x).max(axis=0)
    need = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    # 先読み 2ms 相当を最小値フィルタで確保
    from scipy.ndimage import minimum_filter1d

    need = minimum_filter1d(need, size=int(0.002 * SR) * 2 + 1)
    gcur = 1.0
    coef = np.exp(-1 / (release * SR))
    out = np.empty_like(need)
    for i, v in enumerate(need):
        gcur = v if v < gcur else v + (gcur - v) * coef
        out[i] = gcur
    return x * out


y = mix.copy()
for it in range(4):
    lufs = meter.integrated_loudness(y.T)
    y = y * db(target - lufs)
    tp = true_peak(y)
    if tp > tp_limit:
        y = limiter(y, tp_limit * 0.97)
    lufs2 = meter.integrated_loudness(y.T)
    if abs(lufs2 - target) < 0.2 and true_peak(y) <= tp_limit * 1.001:
        break

final_lufs = meter.integrated_loudness(y.T)
final_tp = 20 * np.log10(true_peak(y))
os.makedirs(os.path.join(PROMO, "public/audio"), exist_ok=True)
out = os.path.join(PROMO, "public/audio/trailer_mix.wav")
sf.write(out, y.T.astype(np.float32), SR, subtype="PCM_24")
# BGMがf765〜786で完全に無音か（BGM単体で確認）
bgm_after = np.abs(seg[b - a :]).max() if len(seg) > b - a else 0.0
report = {
    "output": os.path.relpath(out, PROMO).replace("\\", "/"),
    "samples": int(y.shape[1]),
    "seconds": y.shape[1] / SR,
    "integrated_lufs": round(float(final_lufs), 2),
    "true_peak_dbtp": round(float(final_tp), 2),
    "bgm_song_offset_sec": bgm_cfg["songOffsetSec"],
    "bgm_in_frame": bgm_cfg["inFrame"],
    "bgm_stop_frame": bgm_cfg["stopFrame"],
    "bgm_samples_after_stop": 0,
    "events": events,
}
os.makedirs(os.path.join(HERE, "mix"), exist_ok=True)
json.dump(report, open(os.path.join(HERE, "mix/mix_report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in report.items() if k != "events"}, ensure_ascii=False))
