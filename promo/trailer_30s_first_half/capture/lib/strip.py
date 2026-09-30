"""各クリップから等間隔にN枚抜き出して1枚のシートにする: python strip.py clipId N"""
import subprocess, sys, os, json
from PIL import Image, ImageDraw
FF = os.path.abspath("node_modules/@remotion/compositor-win32-x64-msvc") + os.sep
cid, n = sys.argv[1], int(sys.argv[2])
src = f"capture/clips/{cid}.mp4"
dur = float(json.loads(subprocess.check_output([FF + "ffprobe.exe", "-v", "error", "-show_entries", "format=duration", "-of", "json", src]))["format"]["duration"])
os.makedirs("capture/review", exist_ok=True)
tiles = []
for i in range(n):
    t = dur * (i + 0.5) / n
    out = f"capture/review/{cid}_{i:02d}.png"
    subprocess.check_call([FF + "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", out])
    tiles.append((t, Image.open(out).convert("RGB").resize((320, 240))))
cols = 6
rows = (n + cols - 1) // cols
sheet = Image.new("RGB", (cols * 320, rows * 256), "#111")
d = ImageDraw.Draw(sheet)
for k, (t, im) in enumerate(tiles):
    x, y = (k % cols) * 320, (k // cols) * 256
    sheet.paste(im, (x, y + 16))
    d.text((x + 3, y + 2), f"{cid} t={t:.2f}s", fill="white")
sheet.save(f"capture/review/_{cid}.png")
print(cid, f"{dur:.2f}s")
