# -*- coding: utf-8 -*-
"""Historia de la clase de ECOS — HGG (27 oct 2026). Pone la captura de Zoom completa dentro de
una ventana con borde dorado sobre el fondo oscuro con halo dorado. Mismo sistema que generar-flyer-reunion-fundadores.py.
Uso: python generar-historia-clase.py <captura.png> ["Viernes 6 de noviembre"] [2026-11-06]
Salida: ecos-clase-<fecha>-story-9x16.png (1080×1920)."""
import pathlib
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT = PROJ / "flyers"
FONTS = pathlib.Path.home() / "Library/Fonts"
S = 2  # supermuestreo
W, H = 1080 * S, 1920 * S

BG = (11, 16, 22)
GOLD = (240, 184, 0)
WHITE = (255, 255, 255)
MUTED = (184, 190, 199)
DIM = (107, 115, 128)

Q = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px * S)
JL = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Light.ttf"), px * S)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px * S)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px * S)

def background():
    w, h = W // S, H // S
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h

    def halo(cx, cy, rx, ry, strength, falloff):
        d = np.sqrt(((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2)
        return np.clip(1.0 - d, 0.0, 1.0) ** falloff * strength

    glow = halo(0.5, -0.10, 0.70, 0.40, 0.22, 1.5) + halo(0.5, 0.55, 0.65, 0.30, 0.10, 1.6) + halo(0.5, 1.08, 0.55, 0.30, 0.12, 1.6)
    glow = np.clip(glow, 0, 1)[..., None]
    arr = np.array(BG, np.float32) * (1 - glow) + np.array(GOLD, np.float32) * glow
    grain = np.random.default_rng(7).normal(0, 9, (h, w, 1)).astype(np.float32)
    img = Image.fromarray(np.clip(arr + grain, 0, 255).astype(np.uint8))
    return img.resize((W, H), Image.LANCZOS)


def track_width(d, text, font, tracking):
    return sum(d.textlength(ch, font=font) for ch in text) + tracking * max(len(text) - 1, 0)


def draw_tracked(d, cx, y, text, font, fill, tracking):
    x = cx - track_width(d, text, font, tracking) / 2
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking


def center(d, y, text, font, fill):
    d.text((W / 2, y), text, font=font, fill=fill, anchor="ma")


def build(captura, fecha="Martes 27 de octubre", slug="2026-10-27"):
    src = Image.open(captura).convert("RGB")
    img = background()
    d = ImageDraw.Draw(img)

    # Encabezado (debajo de la zona que tapa la barra de Instagram)
    y = 340 * S
    draw_tracked(d, W / 2, y, "ECOS BUSINESS CLUB", JS(24), GOLD, 7 * S)
    y += 60 * S
    center(d, y, "Clase de hoy", Q(84), WHITE)
    y += 108 * S
    center(d, y, fecha, JL(32), MUTED)

    # Ventana de Zoom con la captura tal cual
    margin, bar, radius = 36 * S, 50 * S, 22 * S
    win_w = W - 2 * margin
    shot_h = round(win_w * src.height / src.width)
    win_h = bar + shot_h
    x0, y0 = margin, 720 * S

    glow = Image.new("L", (win_w + 160 * S, win_h + 160 * S), 0)
    ImageDraw.Draw(glow).rounded_rectangle((80 * S, 80 * S, win_w + 80 * S, win_h + 80 * S), radius, fill=90)
    glow = glow.filter(ImageFilter.GaussianBlur(30 * S))
    img.paste(Image.new("RGB", glow.size, GOLD), (x0 - 80 * S, y0 - 80 * S), glow)

    win = Image.new("RGB", (win_w, win_h), (28, 31, 36))
    wd = ImageDraw.Draw(win)
    for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        cx = 30 * S + i * 26 * S
        wd.ellipse((cx - 7 * S, bar / 2 - 7 * S, cx + 7 * S, bar / 2 + 7 * S), fill=c)
    wd.text((win_w / 2, bar / 2), "Zoom · Clase en vivo de ECOS", font=JR(20), fill=MUTED, anchor="mm")
    win.paste(src.resize((win_w, shot_h), Image.LANCZOS), (0, bar))
    mask = Image.new("L", (win_w, win_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, win_w - 1, win_h - 1), radius, fill=255)
    d.rounded_rectangle((x0 - 3 * S, y0 - 3 * S, x0 + win_w + 3 * S, y0 + win_h + 3 * S), radius + 3 * S, fill=GOLD)
    img.paste(win, (x0, y0), mask)

    # Mensaje de cierre
    y = y0 + win_h + 100 * S
    d.line((W / 2 - 40 * S, y, W / 2 + 40 * S, y), fill=GOLD, width=2 * S)
    y += 44 * S
    center(d, y, "Gracias por estar, por abrirse", Q(46), WHITE)
    y += 62 * S
    center(d, y, "y por crecer juntos.", Q(46), WHITE)

    # Firma
    logo_px = 46 * S
    y = 1700 * S
    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((logo_px, logo_px), Image.LANCZOS)
    img.paste(logo, (W // 2 - logo_px // 2, y), logo)
    draw_tracked(d, W / 2, y + logo_px + 16 * S, "HOLMAN GLOBAL GROUP", JR(16), DIM, 5 * S)

    out = OUT / f"ecos-clase-{slug}-story-9x16.png"
    img.resize((W // S, H // S), Image.LANCZOS).save(out, optimize=True)
    print(out)


if __name__ == "__main__":
    build(*sys.argv[1:4])
