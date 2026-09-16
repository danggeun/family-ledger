# -*- coding: utf-8 -*-
"""logo-master.png(1024 크림 정사각) → 앱 아이콘 전 크기.
   실행:  cd logo && python make_icons.py      (필요: pillow)

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
print("done")
