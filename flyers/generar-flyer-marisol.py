# -*- coding: utf-8 -*-
"""Flyer de presentación de Marisol Alarcón, Directora Comercial de HGG (9 nov 2026).
Mismo lenguaje que la landing /marisol: fondo negro con halo dorado, su foto, el
enfoque, cuatro habilidades y el enlace a la página.
Salidas: vertical 4x5 (feed) y story 9x16 (estados e historias).

    ./.venv/bin/python flyers/generar-flyer-marisol.py
"""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT = PROJ / "flyers"
FOTO = pathlib.Path.home() / "Downloads/Marisol retrato.png"
FONTS = pathlib.Path.home() / "Library/Fonts"
S = 2  # supermuestreo

BG = (11, 16, 22)
GOLD = (240, 184, 0)
WHITE = (255, 255, 255)
MUTED = (184, 190, 199)
DIM = (107, 115, 128)

Q = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px)
JL = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Light.ttf"), px)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px)

HABILIDADES = ["Estrategia comercial", "Embudos y landings", "Campañas y redes", "Contenido que vende"]
ENLACE = "holmanglobalgroup.com/marisol"


def background(w, h, focos):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h
    glow = np.zeros((h, w), np.float32)
    for cx, cy, rx, ry, st, fo in focos:
        dd = np.sqrt(((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2)
        glow += np.clip(1.0 - dd, 0.0, 1.0) ** fo * st
    glow = np.clip(glow, 0, 1)[..., None]
    arr = np.array(BG, np.float32) * (1 - glow) + np.array(GOLD, np.float32) * glow
    grain = np.random.default_rng(7).normal(0, 8, (h, w, 1)).astype(np.float32)
    return Image.fromarray(np.clip(arr + grain, 0, 255).astype(np.uint8)).convert("RGBA")


def tracked(d, x, y, text, font, fill, tr, align="left"):
    total = sum(d.textlength(ch, font=font) for ch in text) + tr * max(len(text) - 1, 0)
    if align == "center":
        x -= total / 2
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tr


def foto_fundida(w, h, lados):
    """La foto recortada a w×h (desde arriba) con los bordes `lados` fundidos al fondo."""
    src = Image.open(FOTO).convert("RGB")
    esc = max(w / src.width, h / src.height)
    src = src.resize((int(src.width * esc + 1), int(src.height * esc + 1)), Image.LANCZOS)
    x0 = (src.width - w) // 2
    src = src.crop((x0, 0, x0 + w, h)).convert("RGBA")
    a = np.ones((h, w), np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    for lado, frac in lados.items():
        if lado == "left":
            a *= np.clip(xx / (w * frac), 0, 1)
        if lado == "right":
            a *= np.clip((w - xx) / (w * frac), 0, 1)
        if lado == "bottom":
            a *= np.clip((h - yy) / (h * frac), 0, 1)
        if lado == "top":
            a *= np.clip(yy / (h * frac), 0, 1)
    a = a ** 1.4  # fundido suave
    src.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    return src


def logo(img, d, x, y, sc, align="left"):
    lp = sc(46)
    lg = Image.open(PROJ / "public/marca/logo-h-claro.png").convert("RGBA").resize((lp, lp), Image.LANCZOS)
    f = JS(sc(17))
    texto = "HOLMAN GLOBAL GROUP"
    tw = sum(d.textlength(ch, font=f) for ch in texto) + sc(5) * (len(texto) - 1)
    if align == "center":
        x = x - (lp + sc(16) + tw) / 2
    img.alpha_composite(lg, (int(x), int(y)))
    tracked(d, x + lp + sc(16), y + lp / 2 - sc(9), texto, f, MUTED, sc(5))


def habilidades(d, x, y, sc, size, gap, align="left", cx=None):
    for h in HABILIDADES:
        f = JR(sc(size))
        if align == "center":
            tw = d.textlength(h, font=f)
            xx = cx - (tw + sc(28)) / 2
        else:
            xx = x
        r = sc(5)
        dy = y + sc(size) * 0.42
        d.polygon([(xx + r, dy - r), (xx + 2 * r, dy), (xx + r, dy + r), (xx, dy)], fill=GOLD)
        d.text((xx + sc(28), y), h, font=f, fill=WHITE)
        y += sc(gap)
    return y


def vertical():
    W1, H1 = 1080, 1350
    W, H = W1 * S, H1 * S
    sc = lambda v: int(v * S)
    img = background(W1, H1, [(0.78, 0.35, 0.55, 0.55, 0.16, 1.6), (0.1, 1.05, 0.6, 0.35, 0.08, 1.6)]).resize((W, H), Image.LANCZOS)
    # foto a la derecha, fundida hacia la izquierda y abajo
    fw, fh = sc(600), H
    img.alpha_composite(foto_fundida(fw, fh, {"left": 0.45, "bottom": 0.18, "top": 0.08}), (W - fw, 0))
    d = ImageDraw.Draw(img)
    x = sc(80)

    logo(img, d, x, sc(80), sc)

    y = sc(330)
    tracked(d, x, y, "BIENVENIDA AL EQUIPO", JS(sc(19)), GOLD, sc(6))
    y += sc(52)
    d.text((x, y), "Marisol", font=Q(sc(118)), fill=WHITE)
    y += sc(122)
    d.text((x, y), "Alarcón", font=Q(sc(118)), fill=GOLD)
    y += sc(160)
    d.text((x, y), "Directora Comercial", font=Q(sc(40)), fill=WHITE)
    y += sc(80)
    d.line((x, y, x + sc(70), y), fill=GOLD, width=sc(2))
    y += sc(40)
    d.text((x, y), "Resultados desde el primer mes,", font=JL(sc(31)), fill=MUTED)
    y += sc(42)
    d.text((x, y), "con proyección a escalar.", font=JR(sc(31)), fill=GOLD)
    y += sc(92)
    habilidades(d, x, y, sc, 28, 52)

    # pie: enlace
    yb = H - sc(110)
    d.line((x, yb - sc(34), W - x, yb - sc(34)), fill=(255, 255, 255, 40), width=sc(1))
    tracked(d, x, yb, "CONÓCELA EN", JR(sc(16)), DIM, sc(4))
    d.text((x + sc(170), yb - sc(6)), ENLACE, font=Q(sc(28)), fill=WHITE)

    img.convert("RGB").resize((W1, H1), Image.LANCZOS).save(OUT / "marisol-directora-comercial-vertical-4x5.png", optimize=True)
    print("  vertical-4x5: 1080x1350")


def story():
    W1, H1 = 1080, 1920
    W, H = W1 * S, H1 * S
    sc = lambda v: int(v * S)
    cx = W / 2
    img = background(W1, H1, [(0.5, 0.2, 0.7, 0.35, 0.16, 1.6), (0.5, 1.05, 0.6, 0.25, 0.1, 1.6)]).resize((W, H), Image.LANCZOS)
    fh = sc(1180)
    img.alpha_composite(foto_fundida(W, fh, {"bottom": 0.42, "top": 0.1, "left": 0.12, "right": 0.12}), (0, sc(100)))
    d = ImageDraw.Draw(img)

    logo(img, d, cx, sc(70), sc, align="center")

    y = sc(1150)
    tracked(d, cx, y, "BIENVENIDA AL EQUIPO", JS(sc(22)), GOLD, sc(7), align="center")
    y += sc(56)
    d.text((cx, y), "Marisol Alarcón", font=Q(sc(104)), fill=WHITE, anchor="ma")
    y += sc(132)
    d.text((cx, y), "Directora Comercial", font=Q(sc(46)), fill=GOLD, anchor="ma")
    y += sc(92)
    d.line((cx - sc(40), y, cx + sc(40), y), fill=GOLD, width=sc(2))
    y += sc(38)
    d.text((cx, y), "Resultados desde el primer mes,", font=JL(sc(36)), fill=MUTED, anchor="ma")
    y += sc(50)
    d.text((cx, y), "con proyección a escalar.", font=JR(sc(36)), fill=WHITE, anchor="ma")
    y += sc(84)
    tracked(d, cx, y, "ESTRATEGIA · EMBUDOS · CAMPAÑAS · CONTENIDO", JR(sc(21)), MUTED, sc(4), align="center")

    yb = H - sc(140)
    tracked(d, cx, yb, "CONÓCELA EN", JR(sc(18)), DIM, sc(5), align="center")
    d.text((cx, yb + sc(36)), ENLACE, font=Q(sc(34)), fill=WHITE, anchor="ma")

    img.convert("RGB").resize((W1, H1), Image.LANCZOS).save(OUT / "marisol-directora-comercial-story-9x16.png", optimize=True)
    print("  story-9x16: 1080x1920")


print("Generando flyers de Marisol…")
vertical()
story()
