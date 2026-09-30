"""画像を並べた確認用シートを作る: python sheet.py out.png cols img1 img2 ..."""
import sys
from PIL import Image, ImageDraw
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
tw = 480
ims = []
for f in files:
    im = Image.open(f).convert("RGB")
    im = im.resize((tw, int(im.height * tw / im.width)))
    ims.append((f, im))
th = max(i.height for _, i in ims) + 22
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), "#222")
d = ImageDraw.Draw(sheet)
for k, (f, im) in enumerate(ims):
    x, y = (k % cols) * tw, (k // cols) * th
    sheet.paste(im, (x, y + 22))
    d.text((x + 4, y + 4), f.replace("\\", "/").split("/")[-1], fill="white")
sheet.save(out)
