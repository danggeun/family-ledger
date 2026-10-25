# -*- coding: utf-8 -*-
"""logo-master.png(1024 크림 정사각) 한 장 → 앱 아이콘 전부. 로고를 바꾸려면 그 파일만 바꾸고 다시 돌린다.
   실행: npm run icons (pillow, numpy, scipy)"""
import os
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
CREAM = (253, 246, 231)
MASKABLE_SCALE = 0.84   # 안드로이드가 80% 원으로 자른다. 최대 반경 478 × 0.84 = 402 < 409

master = Image.open(os.path.join(HERE, "logo-master.png")).convert("RGB")
assert master.size == (1024, 1024), "마스터는 1024 정사각이어야 함"

def save(im, name):
    """원본의 JPEG 얼룩을 걷고 색을 줄여 저장한다(그대로면 PNG 가 4배)."""
    if im.mode == "RGB":
        im = im.filter(ImageFilter.MedianFilter(3)).quantize(
                colors=64, method=Image.MEDIANCUT, dither=Image.NONE)
    im.save(os.path.join(OUT, name), optimize=True)
    kb = os.path.getsize(os.path.join(OUT, name)) // 1024
    print(" ", name, f"{kb}KB")

# manifest / index.html 이 실제로 참조하는 것만 만든다
for s in (192, 512):
    save(master.resize((s, s), Image.LANCZOS), "icon-%d.png" % s)
save(master.resize((180, 180), Image.LANCZOS), "apple-touch-icon.png")   # iOS 전용

inner = int(1024 * MASKABLE_SCALE)
mk = Image.new("RGB", (1024, 1024), CREAM)
mk.paste(master.resize((inner, inner), Image.LANCZOS), ((1024-inner)//2, (1024-inner)//2))
for s in (192, 512):
    save(mk.resize((s, s), Image.LANCZOS), "icon-maskable-%d.png" % s)

# 아이 화면 돼지. 크롭(86..930)은 몸통 중심(x=508.5)에 대칭이라 가운데 정렬 때 코가 이름 · 숫자와 한 줄에 선다
save(master.crop((86, 110, 930, 910)).resize((600, 569), Image.LANCZOS), "logo-pig.png")

# 종이색 위에 놓이는 돼지는 배경 투명. 크림과의 색 거리 40~50 을 램프로, 테두리와 이어진 배경만 지운다(동전 하이라이트 보호)
import numpy as np
from scipy import ndimage
def transparent(box, size, name):
    a = np.asarray(master.crop(box).convert("RGB")).astype(int)
    dist = np.sqrt(((a - np.array(CREAM)) ** 2).sum(axis=2))
    beige = (a[:, :, 1] >= a[:, :, 2]) & (dist < 50)
    lab, n = ndimage.label(beige)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(edge))
    alpha = np.where(outside, np.clip((dist - 40) / 10, 0, 1), 1.0)
    out = Image.fromarray(np.dstack([a.astype("uint8"), (alpha * 255).astype("uint8")]), "RGBA").resize(size, Image.LANCZOS)
    out.save(os.path.join(OUT, name), optimize=True); print(" ", name, os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")
transparent((86, 110, 930, 910), (422, 400), "logo-pig-t.png")     # 시작 화면

# iOS 실행 화면은 logo/make_splash.py
transparent((190, 320, 840, 900), (112, 100), "logo-pig-sm.png")   # 잔액 옆
print("done")
