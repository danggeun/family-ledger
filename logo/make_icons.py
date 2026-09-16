# -*- coding: utf-8 -*-
"""logo-master.png(1024 크림 정사각) → 앱 아이콘 전 크기.
   실행:  cd logo && python make_icons.py      (필요: pillow, numpy)

   원본은 이 마스터 PNG 한 장뿐이다. 크기마다 따로 만들지 말 것.
   로고를 바꾸려면 새 그림을 1024 정사각 크림 배경으로 만들어
   logo-master.png 를 교체하고 이 스크립트를 다시 돌린다."""
import os
from PIL import Image, ImageFilter

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

# 아이 화면용 돼지 — 타일 여백을 잘라내고 600px로 (배경이 크림 #FDF6E7 단색이라 화면 배경과 그대로 이어진다)
# 돼지 몸통(외곽선) 가로 중심이 x=508.5. 하트가 오른쪽에 있어서 그림 전체를 자르면 돼지가 왼쪽으로 치우친다 —
# 크롭을 돼지 중심에 대칭으로 잡아야(86..930) 화면 가운데 정렬했을 때 코가 이름·숫자와 한 줄에 선다
save(master.crop((86, 110, 930, 910)).resize((600, 569), Image.LANCZOS), "logo-pig.png")

# 배경 투명 판 — 종이색(#FDFCFA) 위에 놓이는 곳(시작 화면, 잔액 옆)은 크림 배경과 바닥 그림자를 뺀다.
# 그림자(245,223,203)는 크림에서 거리 ~38, 몸통 분홍은 ~50 이상. 거리 40~50 사이를 램프로 쓰고,
# 분홍은 b>g, 크림·그림자는 g>=b 인 점으로 한 번 더 가른다.
import numpy as np
# 단, 동전의 밝은 하이라이트도 크림에 가까우므로 "바깥(테두리)과 이어진 배경"만 지운다(연결요소).
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
transparent((86, 110, 930, 910), (422, 400), "logo-pig-t.png")     # 시작 화면 (동전·하트 포함, 돼지 중심 대칭)

# iOS 실행 화면(홈 화면 앱을 열 때 잠깐 뜨는 화면). iOS 는 manifest 를 안 보고 이 이미지를 쓴다.
# 기기별 크기를 다 만드는 대신 한 장으로 둔다 — 크림 단색 바탕에 돼지가 가운데라 어떤 비율로 잘려도 멀쩡하다.
sp = Image.new("RGB", (1320, 2868), CREAM)
pig = master.crop((86, 110, 930, 910))
pw = int(1320 * 0.34); ph = int(pw * pig.height / pig.width)
sp.paste(pig.resize((pw, ph), Image.LANCZOS), ((1320 - pw) // 2, (2868 - ph) // 2))
save(sp, "splash.png")
transparent((190, 320, 840, 900), (112, 100), "logo-pig-sm.png")   # 잔액 옆
print("done")
