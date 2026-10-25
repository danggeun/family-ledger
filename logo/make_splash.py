# iOS 실행 화면을 기종별로 만든다(iOS 는 크기 · 배율이 정확히 맞는 한 장만 쓴다).
# 실행: python logo/make_splash.py → splash/*.png 와 index.html 에 넣을 <link> 줄
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(os.path.dirname(HERE), "splash")
CREAM = (253, 246, 231)
master = Image.open(os.path.join(HERE, "logo-master.png")).convert("RGB")
pig = master.crop((86, 110, 930, 910))

# (CSS 폭, CSS 높이, 배율) — 세로만. 이름은 CSS 폭×높이@배율
DEVICES = [
  (440, 956, 3),   # 16 Pro Max · 17 Pro Max
  (402, 874, 3),   # 16 Pro · 17 · 17 Pro
  (420, 912, 3),   # 17 Air
  (430, 932, 3),   # 14 Pro Max · 15 Plus · 15 Pro Max · 16 Plus
  (393, 852, 3),   # 14 Pro · 15 · 15 Pro · 16 · 16e
  (428, 926, 3),   # 12 Pro Max · 13 Pro Max · 14 Plus
  (390, 844, 3),   # 12 · 12 Pro · 13 · 13 Pro · 14
  (375, 812, 3),   # X · XS · 11 Pro · 12 mini · 13 mini
  (414, 896, 3),   # XS Max · 11 Pro Max
  (414, 896, 2),   # XR · 11
  (414, 736, 3),   # 6+ · 7+ · 8+
  (375, 667, 2),   # 6 · 7 · 8 · SE 2 · SE 3
]

os.makedirs(OUT, exist_ok=True)
links = []
for w, h, r in DEVICES:
    W, H = w * r, h * r
    im = Image.new("RGB", (W, H), CREAM)
    pw = int(W * 0.34); ph = int(pw * pig.height / pig.width)          # 폭의 34%
    im.paste(pig.resize((pw, ph), Image.LANCZOS), ((W - pw) // 2, (H - ph) // 2))
    name = "%dx%d@%d.png" % (w, h, r)
    im.save(os.path.join(OUT, name), optimize=True)
    links.append('<link rel="apple-touch-startup-image" media="screen and (device-width: %dpx) and (device-height: %dpx) and (-webkit-device-pixel-ratio: %d) and (orientation: portrait)" href="splash/%s">' % (w, h, r, name))
    print(" ", name, os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")
print("\n".join(links))
