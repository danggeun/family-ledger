# -*- coding: utf-8 -*-
"""용돈기입장 앱 로고 — ₩ 마크 벡터 마스터.
   모든 PNG 아이콘은 이 파일이 만든 SVG 한 장에서만 뽑는다. 크기별로 다시 그리지 않는다.

   구성 (캔버스 1024 기준, 마크 폭 W에 대한 비율):
     캡하이트 0.82W · 사선 획 0.132W · 가로 막대 0.100W
     바깥 꼭짓점→골짜기 가로거리 0.26W · 가운데 봉우리는 캡하이트의 13% 아래에서 멈춤
     막대는 마크 좌우로 0.105W씩 나오고, 캡하이트의 44%·69% 높이에 놓인다
   마감:
     윗끝 2곳은 수평으로 자른다 (활자 W의 터미널)
     아래 꼭짓점 2곳과 가운데 봉우리는 획 두께의 절반으로 둥글린다 (작은 크기에서 뭉치지 않게)
   시각 보정:
     W는 위가 넓고 아래가 뾰족해 무게가 위로 쏠린다. 렌더한 픽셀의 무게중심을 재서
     캔버스 정중앙에 오도록 세로 위치를 보정한다 (기하학적 중앙이 아니라 광학적 중앙).
"""
import math

BG, FG = "#14161A", "#F6F5F2"
CANV   = 1024.0
RATIO_H, SPREAD, PEAK = 0.82, 0.26, 0.13
STROKE, BAR_T, BAR_EXT, BAR_Y = 0.132, 0.100, 0.105, (0.44, 0.69)

RATIO_ANY      = 0.52   # 일반 아이콘 — 마크가 캔버스 폭의 52%
RATIO_MASKABLE = 0.42   # 안드로이드 maskable — 80% 크롭 안전영역 안에 들어가게 더 작게

def svg(mark_ratio, dy=0.0, bg=BG, fg=FG):
    W  = CANV*mark_ratio
    H  = W*RATIO_H
    cx, cy = CANV/2, CANV/2+dy
    x0, x4 = cx-W/2, cx+W/2
    yt, yb = cy-H/2, cy+H/2
    b  = W*SPREAD
    T  = W*STROKE
    A, B, C, D, E = (x0,yt), (x0+b,yb), (cx, yt+H*PEAK), (x4-b,yb), (x4,yt)

    def extend(p, q, d):                       # p를 q 반대방향으로 d만큼 연장
        vx, vy = p[0]-q[0], p[1]-q[1]; L = math.hypot(vx, vy)
        return (p[0]+vx/L*d, p[1]+vy/L*d)
    A2, E2 = extend(A, B, T), extend(E, D, T)  # 윗끝을 빼뒀다가 수평으로 잘라낸다

    path = "M %.2f %.2f L %.2f %.2f L %.2f %.2f L %.2f %.2f L %.2f %.2f" % (
        A2[0],A2[1], B[0],B[1], C[0],C[1], D[0],D[1], E2[0],E2[1])

    bt, ext = W*BAR_T, W*BAR_EXT
    bars = "\n    ".join(
        '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="%.2f"/>'
        % (x0-ext, yt+H*f-bt/2, W+ext*2, bt, bt/2) for f in BAR_Y)

    return (
'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <title>용돈기입장</title>
  <defs>
    <clipPath id="cut"><rect x="0" y="%.2f" width="1024" height="%.2f"/></clipPath>
  </defs>
  <rect width="1024" height="1024" fill="%s"/>
  <path d="%s" fill="none" stroke="%s" stroke-width="%.2f"
        stroke-linejoin="round" stroke-linecap="butt" clip-path="url(#cut)"/>
  <g fill="%s">
    %s
  </g>
</svg>
''' % (yt, CANV-yt, bg, path, fg, T, fg, bars))

def optical_dy(mark_ratio):
    """렌더한 픽셀 무게중심이 캔버스 중앙에 오도록 하는 세로 보정값."""
    import io, cairosvg, numpy as np
    from PIL import Image
    png = cairosvg.svg2png(bytestring=svg(mark_ratio).encode(), output_width=512, output_height=512)
    a = np.asarray(Image.open(io.BytesIO(png)).convert("L"), dtype=float)
    m = (a - a.min())/(a.max()-a.min())
    ys, xs = np.nonzero(m > 0.5)
    return (256 - ys.mean())*2.0

if __name__ == "__main__":
    dy = optical_dy(RATIO_ANY)
    print("광학 중심 보정: %+.1f / 1024" % dy)
    open("logo.svg","w").write(svg(RATIO_ANY, dy))
    open("logo-maskable.svg","w").write(svg(RATIO_MASKABLE, dy*RATIO_MASKABLE/RATIO_ANY))
    print("logo.svg, logo-maskable.svg")
