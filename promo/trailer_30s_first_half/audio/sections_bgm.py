"""区切り（セクション頭）の推定。analyze_bgm.py の結果（拍・小節頭）を使う。

1) ブレイク直後: RMSが周囲より3dB以上落ちる短い区間（フィル/ブレイク）の直後の小節頭
2) 構造: 拍同期のクロマ+MFCCで凝集型クラスタリング（librosa.segment.agglomerative）した境界を小節頭へ吸着
両方が一致する点を「区切りの強い小節頭」とし、そこを f210 に置いた場合の当てはまりを出す。
"""
import json
import os

import librosa
import numpy as np

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
data = json.load(open(os.path.join(HERE, "analysis/bgm_analysis.json"), encoding="utf-8"))
FPS, DROP, SILENCE = 30, 7.0, 25.5
CUTS = [8.5, 10.0, 12.0, 13.5, 15.2, 16.0, 18.0, 20.5, 22.5, 24.0]

out = []
for r in data:
    path = os.path.join(ROOT, r["file"])
    y, sr = librosa.load(path, sr=22050, mono=True)
    beats_t = np.array(r["beats_s"])
    down = np.array(r["downbeats_s"])
    bpm_bar = np.median(np.diff(down)) if len(down) > 1 else 2.0

    # 1) ブレイク
    hop = int(sr * 0.05)
    rms = librosa.amplitude_to_db(librosa.feature.rms(y=y, frame_length=hop * 2, hop_length=hop)[0], ref=1.0)
    t = np.arange(len(rms)) * 0.05
    med = np.array([np.median(rms[max(0, i - 40): i + 40]) for i in range(len(rms))])
    low = rms < med - 3
    breaks = []
    i = 0
    while i < len(low):
        if low[i]:
            j = i
            while j < len(low) and low[j]:
                j += 1
            if 0.15 <= (j - i) * 0.05 <= 1.6 and t[i] > 1.0:
                end = t[j - 1]
                nxt = down[down >= end - 0.15]
                if len(nxt):
                    breaks.append(round(float(nxt[0]), 3))
            i = j
        else:
            i += 1

    # 2) 構造
    frames = librosa.time_to_frames(beats_t, sr=sr)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    feat = np.vstack([librosa.util.normalize(chroma, axis=0), librosa.util.normalize(mfcc, axis=1)])
    sync = librosa.util.sync(feat, frames, aggregate=np.median)
    k = max(4, min(10, int(r["duration_s"] / 8)))
    bounds_idx = librosa.segment.agglomerative(sync, k)
    bt = np.concatenate([[0.0], beats_t])
    seg = sorted({round(float(down[np.argmin(np.abs(down - bt[min(b, len(bt) - 1)]))]), 3) for b in bounds_idx if b > 0})

    strong = [b for b in breaks if any(abs(b - s) <= bpm_bar * 0.6 for s in seg)]

    def fit(P):
        tb = DROP + (beats_t - P)
        tb = tb[(tb >= DROP - 0.01) & (tb <= SILENCE + 0.6)]
        worst = max(float(np.min(np.abs(tb - c))) for c in CUTS)
        td = DROP + (down - P)
        sil = float(td[np.argmin(np.abs(td - SILENCE))])
        return {"max_cut_move_frames": round(worst * FPS, 1), "silence_vs_bar_frames": round((sil - SILENCE) * FPS, 1)}

    cands = [c for c in (strong or breaks) if c + (SILENCE - DROP) <= r["duration_s"] - 0.3]
    out.append({
        "file": r["file"],
        "tempo_fit_bpm": round(60 / np.polyfit(np.arange(len(beats_t)), beats_t, 1)[0], 2),
        "bar_s": round(float(bpm_bar), 3),
        "breaks_then_downbeat": breaks,
        "structure_bounds": seg,
        "strong_section_heads": strong,
        "fits": {str(c): fit(c) for c in cands},
    })
    print(os.path.basename(r["file"]), "| breaks→", breaks[:8], "| struct", seg[:10], "| strong", strong, flush=True)

json.dump(out, open(os.path.join(HERE, "analysis/bgm_sections.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
