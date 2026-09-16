# -*- coding: utf-8 -*-
"""logo-master.png(1024 크림 정사각) → 앱 아이콘 전 크기.
   실행:  cd logo && python make_icons.py      (필요: pillow, numpy)

   원본은 이 마스터 PNG 한 장뿐이다. 크기마다 따로 만들지 말 것.
   로고를 바꾸려면 새 그림을 1024 정사각 크림 배경으로 만들어
   logo-master.png 를 교체하고 이 스크립트를 다시 돌린다."""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
CREAM = (253, 246, 231)
MASKABLE_SCALE = 0.84   # 안드로이드가 80% 원으로 잘라내므로 그림을 줄여 안전영역 안에 넣는다
                        # 검산: 아트 최대반경 478 × 0.84 = 402 < 409

master = Image.open(os.path.join(HERE, "logo-master.png")).convert("RGB")
assert master.size == (1024, 1024), "마스터는 1024 정사각이어야 함"

def save(im, name):
    """JPEG 잡음을 걷어내고 색을 줄여 저장한다. 원본 시안이 JPEG이라
       평평해야 할 면에 미세한 얼룩이 있고, 그대로 PNG로 넣으면 파일이 4배 커진다."""
    if im.mode == "RGB":
        im = im.filter(ImageFilter.MedianFilter(3)).quantize(
                colors=128, method=Image.MEDIANCUT, dither=Image.NONE)
    im.save(os.path.join(OUT, name), optimize=True)
    kb = os.path.getsize(os.path.join(OUT, name)) // 1024
    print(" ", name, f"{kb}KB")

def rounded(im, frac=0.225):
    """모서리를 둥글려 투명 PNG로 (앱 안에서 쓰는 판형)"""
    S = im.size[0]; m = Image.new("L", (S*4, S*4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, S*4-1, S*4-1], radius=int(S*frac)*4, fill=255)
    out = im.convert("RGBA"); out.putalpha(m.resize((S, S), Image.LANCZOS)); return out

# manifest / index.html 이 실제로 참조하는 것만 만든다
for s in (192, 512):
    save(master.resize((s, s), Image.LANCZOS), "icon-%d.png" % s)
save(master.resize((180, 180), Image.LANCZOS), "apple-touch-icon.png")   # iOS 전용

inner = int(1024 * MASKABLE_SCALE)
mk = Image.new("RGB", (1024, 1024), CREAM)
mk.paste(master.resize((inner, inner), Image.LANCZOS), ((1024-inner)//2, (1024-inner)//2))
for s in (192, 512):
    save(mk.resize((s, s), Image.LANCZOS), "icon-maskable-%d.png" % s)

save(rounded(master.resize((256, 256), Image.LANCZOS)), "logo-mark.png")

# 아이 화면용 돼지 — 타일 여백을 잘라내고 600px로 (배경이 크림 #FDF6E7 단색이라 화면 배경과 그대로 이어진다)
# 돼지 몸통(외곽선) 가로 중심이 x=508.5. 하트가 오른쪽에 있어서 그림 전체를 자르면 돼지가 왼쪽으로 치우친다 —
# 크롭을 돼지 중심에 대칭으로 잡아야(86..930) 화면 가운데 정렬했을 때 코가 이름·숫자와 한 줄에 선다
save(master.crop((86, 110, 930, 910)).resize((600, 569), Image.LANCZOS), "logo-pig.png")

# 잔액 옆 작은 돼지 — 종이색(#FDFCFA) 위에 놓이므로 크림 배경과 그림자를 투명하게 뺀다
import numpy as np
face = master.crop((190, 320, 840, 900)).convert("RGB")
a = np.asarray(face).astype(int); dist = np.sqrt(((a - np.array(CREAM)) ** 2).sum(axis=2))
alpha = np.clip((dist - 30) / 25, 0, 1)                    # 크림·그림자(거리 ~34)는 0, 분홍·검정은 1
out = Image.fromarray(np.dstack([a.astype("uint8"), (alpha * 255).astype("uint8")]), "RGBA")
out = out.resize((112, 100), Image.LANCZOS)
out.save(os.path.join(OUT, "logo-pig-sm.png"), optimize=True); print("  logo-pig-sm.png", os.path.getsize(os.path.join(OUT, "logo-pig-sm.png")) // 1024, "KB")
print("done")
