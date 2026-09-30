"""BRIEF.md §6: assets/audio/source/wav/ の001〜010を解析する（読み取りのみ）。

出力: audio/analysis/bgm_analysis.json と、曲ごとのエネルギー曲線PNG。
- BPM・ビート位置（librosa.beat.beat_track）
- 小節頭の推定（4拍周期のうち、アクセントが最も強い位相）
- 「サビ頭／区切り」候補: 小節頭のうち、直前4小節→直後4小節でRMSが大きく上がる点
- 予告への当てはめ: 候補点Pを f210(7.0s) に置いたとき、C05〜C14の目標カット点が拍に±3フレームで乗るか、f765(25.5s)が小節頭に近いか
"""
import json
import os
import sys

import librosa
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
WAV_DIR = os.path.join(ROOT, "assets/audio/source/wav")
OUT = os.path.join(os.path.dirname(__file__), "analysis")
os.makedirs(OUT, exist_ok=True)

FPS = 30
DROP = 7.0  # f210
SILENCE = 25.5  # f765
# BRIEF §4 のC05〜C14の目標カット点（秒）。f456のインパクトも拍に乗せたい
TARGET_CUTS = [8.5, 10.0, 12.0, 13.5, 16.0, 18.0, 20.5, 22.5, 24.0]
IMPACT = 15.2


def analyze(path):
    y, sr = librosa.load(path, sr=22050, mono=True)
    dur = len(y) / sr
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, units="frames")
    tempo = float(np.atleast_1d(tempo)[0])
    beat_t = librosa.frames_to_time(beats, sr=sr)
    # 小節頭: 低域オンセット（キック/ベース）を拍ごとに取り、4拍周期で最も強い位相
    low = librosa.onset.onset_strength(y=y, sr=sr, fmax=250)
    acc = low[np.clip(beats, 0, len(low) - 1)]
    phase = int(np.argmax([acc[p::4].mean() if len(acc[p::4]) else 0 for p in range(4)]))
    downbeats = beat_t[phase::4]
    # RMS（0.1秒刻み）
    hop = int(sr * 0.1)
    rms = librosa.feature.rms(y=y, frame_length=hop * 2, hop_length=hop)[0]
    rms_db = librosa.amplitude_to_db(rms, ref=np.max(rms))
    t_rms = np.arange(len(rms)) * 0.1

    def mean_db(a, b):
        m = (t_rms >= a) & (t_rms < b)
        return float(rms_db[m].mean()) if m.any() else -80.0

    bar = 4 * 60.0 / tempo
    cands = []
    for d in downbeats:
        if d < 2 * bar or d > dur - 4 * bar:
            continue
        before = mean_db(d - 4 * bar, d)
        after = mean_db(d, d + 4 * bar)
        cands.append({"t": round(float(d), 3), "rise_db": round(after - before, 2), "after_db": round(after, 1)})
    cands.sort(key=lambda c: -c["rise_db"])

    def fit(P):
        """候補Pをf210に置いたときの拍の乗り具合"""
        # 予告時間 T の拍 = DROP + (曲の拍 - P)
        bt = DROP + (beat_t - P)
        bt = bt[(bt >= DROP - 0.01) & (bt <= SILENCE + 0.5)]
        res = {}
        worst = 0.0
        for c in TARGET_CUTS + [IMPACT]:
            near = bt[np.argmin(np.abs(bt - c))] if len(bt) else None
            # 目標は伸び縮み可。最寄り拍へのズレ（秒）と、その拍のフレーム
            res[str(c)] = {"beat": round(float(near), 3), "frame": int(round(near * FPS)), "offset_s": round(float(near - c), 3)}
        db = DROP + (downbeats - P)
        near_bar = float(db[np.argmin(np.abs(db - SILENCE))])
        # 曲の拍のフレーム量子化誤差（拍を最寄りフレームに丸めたときのズレ、最大値）
        q = np.abs(bt * FPS - np.round(bt * FPS)).max() if len(bt) else 0
        return {
            "cuts": res,
            "silence_nearest_downbeat": round(near_bar, 3),
            "silence_bar_offset_frames": round((near_bar - SILENCE) * FPS, 1),
            "beat_frame_quantize_max": round(float(q), 2),
            "song_end_needed": round(P + (SILENCE - DROP), 2),
        }

    top = [dict(c, fit=fit(c["t"])) for c in cands[:6] if c["t"] + (SILENCE - DROP) <= dur]
    # 曲頭（最初の小節頭）も候補として残す
    first_db = float(downbeats[0]) if len(downbeats) else 0.0

    # エネルギー曲線の図
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(14, 3))
        ax.plot(t_rms, rms_db, lw=0.8)
        for d in downbeats:
            ax.axvline(d, color="#ccc", lw=0.3)
        for c in cands[:4]:
            ax.axvline(c["t"], color="red", lw=1.2)
        ax.set_title(f"{os.path.basename(path)}  tempo≈{tempo:.1f}  dur={dur:.1f}s  (red = top section-head candidates)")
        ax.set_xlabel("s")
        fig.tight_layout()
        fig.savefig(os.path.join(OUT, os.path.basename(path).replace(".wav", ".png")), dpi=80)
        plt.close(fig)
    except ImportError:
        pass

    info = sf_info(path)
    return {
        "file": os.path.relpath(path, ROOT).replace("\\", "/"),
        "duration_s": round(dur, 2),
        **info,
        "tempo_bpm": round(tempo, 2),
        "beat_count": int(len(beat_t)),
        "beat_interval_s": round(float(np.median(np.diff(beat_t))), 4) if len(beat_t) > 1 else None,
        "first_beat_s": round(float(beat_t[0]), 3) if len(beat_t) else None,
        "first_downbeat_s": round(first_db, 3),
        "downbeat_phase": phase,
        "section_head_candidates": top,
        "beats_s": [round(float(b), 3) for b in beat_t],
        "downbeats_s": [round(float(b), 3) for b in downbeats],
    }


def sf_info(path):
    import wave

    try:
        with wave.open(path) as w:
            return {"sample_rate": w.getframerate(), "channels": w.getnchannels(), "sample_width": w.getsampwidth()}
    except Exception as e:  # 32bit float等
        return {"wave_info_error": str(e)}


if __name__ == "__main__":
    files = sorted(f for f in os.listdir(WAV_DIR) if f.endswith(".wav"))
    results = []
    for f in files:
        r = analyze(os.path.join(WAV_DIR, f))
        results.append(r)
        top = r["section_head_candidates"][:3]
        print(f"{f}: {r['duration_s']}s  {r['tempo_bpm']}BPM  first_db={r['first_downbeat_s']}  top=" + ", ".join(f"{c['t']}s(+{c['rise_db']}dB)" for c in top), flush=True)
    with open(os.path.join(OUT, "bgm_analysis.json"), "w", encoding="utf-8") as fp:
        json.dump(results, fp, ensure_ascii=False, indent=1)
