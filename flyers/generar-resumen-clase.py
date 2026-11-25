# -*- coding: utf-8 -*-
"""Resumen de una clase de ECOS en una imagen (17 nov 2026: «El hilo argumental»,
lo pidió Genaro). Mismo fondo negro con halo dorado de los flyers de ECOS.
Para otra clase, cambia TITULO, SUBTITULO, PUNTOS, CIERRE y SALIDA.
Salida: 4x5 (1080x1350), se lee bien en el chat de WhatsApp.

    ../redes/.venv/bin/python generar-resumen-clase.py
"""
import pathlib
import types

import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT = PROJ / "flyers"
FONTS = pathlib.Path.home() / "Library/Fonts"

# Fondo y textos espaciados de generar-flyer-oratoria.py (solo las funciones: ese
# script genera sus flyers al importarlo).
_src = (OUT / "generar-flyer-oratoria.py").read_text()
fo = types.SimpleNamespace(np=np, Image=Image)
exec(_src[_src.index("BG = "):_src.index("Q = lambda")], vars(fo))
exec(_src[_src.index("def background"):_src.index("def build")], vars(fo))

TITULO = "El hilo argumental"
SUBTITULO = "Clase de oratoria · 17 de noviembre"
PUNTOS = [
    ("Antes de empezar", "¿Qué quiero que el público se lleve, aprenda o haga?"),
    ("Introducción", "Abre con un gancho: una pregunta o una historia. Sin presentarte."),
    ("Desarrollo", "Sigue lo que planteó la intro: una historia propia o tres ideas claras."),
    ("Conclusión", "Un llamado a la acción claro. Si abriste con una pregunta, respóndela."),
    ("En grupo", "Escucha a tu compañero: el mensaje del grupo va antes que el tuyo."),
]
CIERRE = ["Hilo argumental: la carretera.", "Hilo conductor: no salirte de ella."]
SALIDA = OUT / "ecos-resumen-hilo-argumental-2026-11-17.png"

S = 2
W1, H1 = 1080, 1350
Q = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px * S)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px * S)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px * S)


def wrap(d, text, font, maxw):
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if d.textlength(t, font=font) <= maxw:
            cur = t
        else:
            lines.append(cur)
            cur = word
    return lines + [cur]


def build():
    W, H = W1 * S, H1 * S
    img = fo.background(W1, H1).resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    cx = W / 2

    lp = 56 * S
    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((lp, lp), Image.LANCZOS)
    y = 70 * S
    img.paste(logo, (int(cx - lp / 2), y), logo)
    y += lp + 20 * S
    fo.tracked(d, cx, y, "ECOS BUSINESS CLUB", JS(20), fo.GOLD, 7 * S)
    y += 58 * S
    d.text((cx, y), TITULO, font=Q(78), fill=fo.WHITE, anchor="ma")
    y += 104 * S
    d.text((cx, y), SUBTITULO, font=JR(30), fill=fo.MUTED, anchor="ma")
    y += 78 * S

    left, numw, right = 110 * S, 78 * S, W - 110 * S
    for i, (cab, txt) in enumerate(PUNTOS, 1):
        d.text((left, y - 6 * S), f"{i:02d}", font=Q(46), fill=fo.GOLD)
        tx = left + numw
        d.text((tx, y), cab, font=JS(32), fill=fo.WHITE)
        yy = y + 44 * S
        for ln in wrap(d, txt, JR(28), right - tx):
            d.text((tx, yy), ln, font=JR(28), fill=fo.MUTED)
            yy += 36 * S
        y = yy + 30 * S

    y += 6 * S
    d.line([(cx - 40 * S, y), (cx + 40 * S, y)], fill=fo.GOLD, width=2 * S)
    y += 30 * S
    for ln in CIERRE:
        d.text((cx, y), ln, font=Q(34), fill=fo.WHITE, anchor="ma")
        y += 48 * S

    fo.tracked(d, cx, H - 70 * S, "HOLMAN GLOBAL GROUP", JR(18), fo.DIM, 7 * S)
    print("alto usado:", y // S, "de", H1)
    img.resize((W1, H1), Image.LANCZOS).save(SALIDA)
    print(SALIDA)


if __name__ == "__main__":
    build()
