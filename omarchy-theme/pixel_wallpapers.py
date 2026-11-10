#!/usr/bin/env python3
"""Draw 8-bit pixel-art wallpapers (640x360 PPM) in the palette from tokens.json.
Usage: pixel_wallpapers.py <tokens.json> <out_dir>"""
import math, random, sys, os

W, H = 640, 360
TOKENS, OUT = sys.argv[1], sys.argv[2]

def hx(s):
    s = s.lstrip('#'); return tuple(int(s[i:i+2], 16) for i in (0, 2, 4))

import json
_tok = {t["name"]: t["value"] for t in json.load(open(TOKENS))["color"]["tokens"]}
def tk(name):
    v = _tok[name]
    while v.startswith("{"): v = _tok[v[1:-1]]
    return hx(v)

BG0, BG1, BG2, BG3 = tk("sk-bg"), tk("sk-bg-2"), tk("sk-card"), tk("sk-card-2")
PINK, MAG, CYAN, YEL = tk("sk-primary"), tk("sk-neon-purple"), tk("sk-accent"), tk("sk-neon-yellow")
ORA, GRN, WHITE, BLUE = tk("sk-neon-orange"), tk("sk-neon-green"), tk("sk-fg"), tk("sk-neon-blue")
DPURP, BLACK = tk("sk-muted"), hx("07040f")

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

def canvas(): return [[BG1] * W for _ in range(H)]

def put(img, x, y, c):
    if 0 <= x < W and 0 <= y < H: img[y][x] = c

def rect(img, x0, y0, x1, y1, c):
    for y in range(max(0, y0), min(H, y1)):
        row = img[y]
        for x in range(max(0, x0), min(W, x1)): row[x] = c

def dither_gradient(img, y0, y1, stops):
    """Vertical gradient across palette stops using 4x4 ordered dithering."""
    n = len(stops) - 1
    for y in range(y0, y1):
        t = (y - y0) / max(1, (y1 - y0 - 1)) * n
        i = min(int(t), n - 1); f = t - i
        for x in range(W):
            img[y][x] = stops[i + 1] if f * 16 > BAYER[y % 4][x % 4] + 0.5 else stops[i]

def stars(img, y1, n, rnd):
    for _ in range(n):
        x, y = rnd.randrange(W), rnd.randrange(y1)
        c = rnd.choice([WHITE, WHITE, CYAN, PINK])
        put(img, x, y, c)
        if rnd.random() < 0.08:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): put(img, x + dx, y + dy, DPURP if c != WHITE else BLUE)

def striped_sun(img, cx, cy, r, top, bot, cut_from):
    for y in range(cy - r, cy + r):
        dy = y - cy
        if dy > 0 and dy >= cut_from: break
        # retro gaps growing toward the bottom
        if dy > -r // 3:
            band = (dy + r // 3)
            gap = 1 + band // 8
            if band % 8 < gap: continue
        half = int(math.sqrt(max(0, r * r - dy * dy)))
        t = (dy + r) / (2 * r)
        for x in range(cx - half, cx + half):
            c = bot if t * 16 > BAYER[y % 4][x % 4] + 0.5 else top
            put(img, x, y, c)

def save(img, name):
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(b'P6 %d %d 255\n' % (W, H))
        f.write(bytes(v for row in img for px in row for v in px))

def skyline(img, rnd, base, hmin, hmax, wmin, wmax, body, lit, density):
    x = -rnd.randrange(10)
    while x < W:
        w = rnd.randrange(wmin, wmax); h = rnd.randrange(hmin, hmax)
        top = base - h
        rect(img, x, top, x + w, base, body)
        # roof details
        if rnd.random() < 0.4:
            ax = x + rnd.randrange(2, max(3, w - 2))
            rect(img, ax, top - rnd.randrange(6, 18), ax + 1, top, body)
            put(img, ax, top - 18 if False else top - 6, PINK)
        if rnd.random() < 0.3:
            rect(img, x + 2, top - 3, x + w - 2, top, body)
        # windows
        for wy in range(top + 3, base - 2, 4):
            for wx in range(x + 2, x + w - 2, 3):
                if rnd.random() < density:
                    put(img, wx, wy, rnd.choice(lit)); put(img, wx + 1, wy, rnd.choice(lit)) if rnd.random() < .3 else None
        # neon sign
        if w > 14 and rnd.random() < 0.35:
            sy = top + rnd.randrange(4, max(5, h // 2)); sc = rnd.choice([PINK, CYAN, YEL, GRN, MAG])
            sw = rnd.randrange(6, min(14, w - 2))
            rect(img, x + 1, sy, x + 1 + sw, sy + 1, sc)
            rect(img, x + 1, sy + 4, x + 1 + sw, sy + 5, sc)
            rect(img, x + 1, sy, x + 2, sy + 5, sc); rect(img, x + sw, sy, x + sw + 1, sy + 5, sc)
        x += w + rnd.randrange(0, 4)

# ---------- 1: neon city night ----------
def city():
    rnd = random.Random(82)
    img = canvas()
    dither_gradient(img, 0, 250, [BG0, BG1, BG2, BG3, MAG, PINK])
    stars(img, 170, 260, rnd)
    striped_sun(img, 470, 200, 70, YEL, PINK, 999)
    skyline(img, rnd, 300, 40, 140, 12, 30, DPURP, [BG3, MAG], 0.18)
    skyline(img, rnd, 320, 30, 190, 14, 36, BG0, [CYAN, PINK, YEL, WHITE], 0.28)
    rect(img, 0, 320, W, H, BLACK)
    # street glow + reflections
    for y in range(320, H):
        for x in range(W):
            if (x + y) % 7 == 0 and BAYER[y % 4][x % 4] < 3: img[y][x] = DPURP
    for x in range(0, W, 24): rect(img, x, 334, x + 12, 335, YEL)
    for y in range(321, H, 2):
        for x in range(W):
            src = img[2 * 320 - y][x]
            if src in (CYAN, PINK, YEL) and rnd.random() < 0.5: img[y][x] = src
    save(img, 'city.ppm')

# ---------- 2: synth grid horizon ----------
def grid():
    rnd = random.Random(1982)
    img = canvas()
    hz = 210
    dither_gradient(img, 0, hz, [BG0, BG1, BG2, BG3, MAG])
    stars(img, 150, 200, rnd)
    striped_sun(img, W // 2, hz - 10, 90, YEL, PINK, 10)
    # pixel mountains
    for layer, (col, amp, off) in enumerate([(DPURP, 55, 0), (BG0, 35, 3)]):
        h = 0.0
        for x in range(W):
            h = amp * (0.5 + 0.5 * math.sin(x / (37 - layer * 9) + off)) * (0.6 + 0.4 * math.sin(x / 11 + off * 2))
            if abs(x - W // 2) < 110 - layer * 30: h *= 0.25
            top = hz - int(h) // 2 * 2
            rect(img, x, top, x + 1, hz, col)
            if layer == 0 and rnd.random() < 0.03: put(img, x, top, CYAN)
    rect(img, 0, hz, W, H, BLACK)
    # perspective grid
    vx = W // 2
    for i in range(-30, 31):
        for y in range(hz, H):
            t = (y - hz) / (H - hz)
            x = int(vx + i * 24 * (0.05 + t * 1.6))
            put(img, x, y, MAG if t < 0.25 else PINK)
    y = hz + 1; step = 1.0
    while y < H:
        rect(img, 0, int(y), W, int(y) + 1, MAG if y < hz + 30 else PINK)
        step *= 1.32; y += step
    rect(img, 0, hz, W, hz + 1, CYAN)
    save(img, 'grid.ppm')

# ---------- 3: rainy neon alley ----------
def rain():
    rnd = random.Random(2077)
    img = canvas()
    dither_gradient(img, 0, H, [BG0, BG1, BG2, BG1, BG0])
    skyline(img, rnd, 300, 120, 280, 18, 50, DPURP, [BG3, CYAN, MAG], 0.22)
    skyline(img, rnd, 360, 60, 330, 30, 70, BG0, [PINK, CYAN, YEL, GRN], 0.12)
    # big vertical neon sign
    sx, sy = 92, 60
    for k, c in enumerate([PINK, CYAN, YEL, PINK, GRN]):
        rect(img, sx, sy + k * 22, sx + 14, sy + k * 22 + 16, BG0)
        rect(img, sx + 2, sy + k * 22 + 2, sx + 12, sy + k * 22 + 3, c)
        rect(img, sx + 2, sy + k * 22 + 13, sx + 12, sy + k * 22 + 14, c)
        rect(img, sx + 2 + (k % 3) * 3, sy + k * 22 + 3, sx + 4 + (k % 3) * 3, sy + k * 22 + 13, c)
    rect(img, sx - 1, sy - 2, sx + 15, sy - 1, MAG); rect(img, sx - 1, sy + 110, sx + 15, sy + 111, MAG)
    # rain streaks
    for _ in range(900):
        x, y = rnd.randrange(W), rnd.randrange(H)
        c = rnd.choice([BLUE, DPURP, BG3, CYAN])
        for j in range(rnd.randrange(3, 8)):
            put(img, x - j // 3, y + j, c)
    save(img, 'rain.ppm')

city(); grid(); rain()
