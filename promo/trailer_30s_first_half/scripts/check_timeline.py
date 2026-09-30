"""タイムラインの機械チェック（BRIEF §4・§1）
- 尺 900f、固定点 f210/f765/f786/f900
- C05〜C14 の境目が拍に ±3f 以内
- 異常演出（glitchFrames）の合計が 30f 未満
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
tl = json.load(open(os.path.join(ROOT, "src/data/timeline.json"), encoding="utf-8"))
beats = json.load(open(os.path.join(ROOT, "src/data/beats_006.json"), encoding="utf-8"))["beats"]
bf = [b["f"] for b in beats]
cuts = tl["cuts"]
ok = True


def check(cond, msg):
    global ok
    ok &= bool(cond)
    print(("OK  " if cond else "NG  ") + msg)


check(cuts["C16"][1] == 900, f"尺 = {cuts['C16'][1]} フレーム（900）")
check(cuts["C05"][0] == 210, "BGMドロップ f210")
check(cuts["C15"][0] == 765, "無音 f765")
check(cuts["C16"][0] == 786, "ロゴ f786")
ids = list(cuts)
for a, b in zip(ids, ids[1:]):
    check(cuts[a][1] == cuts[b][0], f"{a}→{b} が連続（f{cuts[a][1]}）")
for cid in ["C06", "C07", "C08", "C09", "C10", "C11", "C12", "C13", "C14"]:
    f = cuts[cid][0]
    near = min(bf, key=lambda x: abs(x - f))
    down = next(b["down"] for b in beats if b["f"] == near)
    check(abs(near - f) <= 3, f"{cid} 開始 f{f} ↔ 拍 f{near:.2f}（ずれ {f - near:+.2f}f{'・小節頭' if down else ''}）")
imp = tl["beatsUsed"]["C09_impact"]
near = min(bf, key=lambda x: abs(x - imp))
check(abs(near - imp) <= 3, f"C09 インパクト f{imp} ↔ 拍 f{near:.2f}")
g = tl["glitchFrames"]
total = sum(len(v) for k, v in g.items() if not k.startswith("_"))
check(total < 30, f"異常演出の合計 {total}f = {total / 30:.2f}秒（1秒未満）")
print("ALL OK" if ok else "SOME CHECKS FAILED")
