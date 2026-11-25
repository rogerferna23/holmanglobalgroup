# -*- coding: utf-8 -*-
"""Story 9:16 de una Bitácora del Elefante (24 nov 2026: «Lo simple también es
maravilloso», el ejercicio de agradecimiento). Mismo fondo negro con halo dorado
de los flyers de ECOS. Para otra Bitácora, cambia TITULO, TAREA, LINEAS, FRASE y SALIDA.

    ../redes/.venv/bin/python generar-story-bitacora.py
"""
import pathlib
import types

import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT = PROJ / "flyers"
FONTS = pathlib.Path.home() / "Library/Fonts"

_src = (OUT / "generar-flyer-oratoria.py").read_text()
fo = types.SimpleNamespace(np=np, Image=Image)
exec(_src[_src.index("BG = "):_src.index("Q = lambda")], vars(fo))
exec(_src[_src.index("def background"):_src.index("def build")], vars(fo))

TITULO = ["Lo simple también", "es maravilloso"]
TAREA = ["Escribe tres cosas por las que", "estás agradecido hoy"]
LINEAS = 3  # renglones numerados para llenar
FRASE = ["Cuando agradeces, lo que ya está", "se vuelve más grande."]
SALIDA = OUT / "bitacora-agradecimiento-2026-11-24-story-9x16.png"

S = 2
W1, H1 = 1080, 1920
Q = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px * S)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px * S)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px * S)


def build():
    W, H = W1 * S, H1 * S
    img = fo.background(W1, H1).resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    cx = W / 2

    # Zona segura de stories: ~250 px arriba y abajo libres.
    lp = 64 * S
    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((lp, lp), Image.LANCZOS)
    y = 360 * S
    img.paste(logo, (int(cx - lp / 2), y), logo)
    y += lp + 26 * S
    fo.tracked(d, cx, y, "LA BITÁCORA DEL ELEFANTE", JS(22), fo.GOLD, 7 * S)
    y += 80 * S
    for ln in TITULO:
        d.text((cx, y), ln, font=Q(80), fill=fo.WHITE, anchor="ma")
        y += 98 * S

    y += 40 * S
    d.line([(cx - 40 * S, y), (cx + 40 * S, y)], fill=fo.GOLD, width=2 * S)
    y += 50 * S
    fo.tracked(d, cx, y, "EL EJERCICIO DE HOY", JS(20), fo.MUTED, 6 * S)
    y += 52 * S
    for ln in TAREA:
        d.text((cx, y), ln, font=JR(38), fill=fo.WHITE, anchor="ma")
        y += 52 * S

    y += 46 * S
    left, right = 170 * S, W - 170 * S
    for i in range(1, LINEAS + 1):
        d.text((left, y), f"{i:02d}", font=Q(46), fill=fo.GOLD)
        ly = y + 50 * S
        d.line([(left + 82 * S, ly), (right, ly)], fill=fo.DIM, width=2 * S)
        y += 96 * S

    y += 50 * S
    for ln in FRASE:
        d.text((cx, y), ln, font=Q(40), fill=fo.GOLD, anchor="ma")
        y += 56 * S

    fo.tracked(d, cx, H - 250 * S, "HOLMAN GLOBAL GROUP", JR(18), fo.DIM, 7 * S)
    print("alto usado:", y // S, "de", H1, "(pie en", H1 - 250, ")")
    img.resize((W1, H1), Image.LANCZOS).save(SALIDA)
    print(SALIDA)


if __name__ == "__main__":
    build()
