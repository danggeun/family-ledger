# -*- coding: utf-8 -*-
"""logo.svg / logo-maskable.svg → 앱 아이콘 PNG 전 크기.
   실행:  cd logo && python build_logo.py && python export_icons.py
   (필요 패키지: cairosvg)"""
import os, io, cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.dirname(HERE)          # 앱 루트

def render(svg_path, size, out_name):
    png = cairosvg.svg2png(url=os.path.join(HERE, svg_path), output_width=size, output_height=size)
    Image.open(io.BytesIO(png)).convert("RGB").save(os.path.join(OUT, out_name), optimize=True)
    print(" ", out_name, "%dx%d" % (size, size))

for s in (180, 192, 256, 384, 512, 1024):
    render("logo.svg", s, "icon-%d.png" % s)
render("logo.svg", 180, "apple-touch-icon.png")
for s in (192, 512):
    render("logo-maskable.svg", s, "icon-maskable-%d.png" % s)
print("done")
