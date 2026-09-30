# -*- coding: utf-8 -*-
"""Tarjetas de los enlaces de agenda de HGG (lo que se ve al pegarlos en WhatsApp).

Mismo diseño que public/og-agenda.png: logo H, «Sentido · Marca · Sistema», un
filete dorado, el nombre del enlace y «Holman Global Group». Solo cambia el
título, para que cada enlace se distinga a primera vista.

    python3 flyers/generar-og-enlaces.py
"""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJ = pathlib.Path(__file__).resolve().parent.parent
FONTS = pathlib.Path.home() / "Library/Fonts"
S = 2  # se arma a 2x y se reduce: texto más limpio

BG = (11, 16, 22)
GOLD = (240, 184, 0)
WHITE = (255, 255, 255)
MUTED = (184, 190, 199)

Q = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px)

# (archivo en public/, título)
TARJETAS = [
    ("og-sesion.png", "Sesión de coaching"),
]


def fondo(w, h):
    """Oscuro con un halo dorado detrás del logo."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx / w - 0.5) / 0.55) ** 2 + ((yy / h - 0.36) / 0.75) ** 2)
    glow = (np.clip(1.0 - d, 0, 1) ** 1.6 * 0.20)[..., None]
    arr = np.array(BG, np.float32) * (1 - glow) + np.array(GOLD, np.float32) * glow
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def espaciado(d, cx, y, texto, fuente, color, sep):
    ancho = sum(d.textlength(c, font=fuente) for c in texto) + sep * (len(texto) - 1)
    x = cx - ancho / 2
    for c in texto:
        d.text((x, y), c, font=fuente, fill=color)
        x += d.textlength(c, font=fuente) + sep


def tarjeta(archivo, titulo):
    W, H = 1200 * S, 630 * S
    img = fondo(W, H)
    d = ImageDraw.Draw(img)
    cx = W // 2

    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA")
    lw = 250 * S
    logo = logo.resize((lw, lw), Image.LANCZOS)
    img.paste(logo, (cx - lw // 2, 68 * S), logo)

    espaciado(d, cx, 358 * S, "SENTIDO  ·  MARCA  ·  SISTEMA", JS(26 * S), GOLD, 6 * S)
    d.line([(cx - 40 * S, 426 * S), (cx + 40 * S, 426 * S)], fill=GOLD, width=2 * S)

    f = Q(60 * S)
    b = d.textbbox((0, 0), titulo, font=f)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], 452 * S - b[1]), titulo, font=f, fill=WHITE)

    espaciado(d, cx, 546 * S, "HOLMAN GLOBAL GROUP", JR(17 * S), MUTED, 5 * S)

    img.resize((1200, 630), Image.LANCZOS).save(PROJ / "public" / archivo, optimize=True)
    print(f"  ✓ public/{archivo}  ({titulo})")


if __name__ == "__main__":
    for a, t in TARJETAS:
        tarjeta(a, t)
