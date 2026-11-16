# -*- coding: utf-8 -*-
"""Flyer de la clase de oratoria de ECOS (jue 5 nov 2026). Los flyers de ECOS van
en negro con halo dorado y sin foto (mismo fondo que generar-historia-clase.py):
la clase, el día y la hora, «7 días de regalo» y las horas por país.
Salidas: vertical 4x5 (feed) y story 9x16 (estados e historias).

    ./.venv/bin/python flyers/generar-flyer-oratoria.py
"""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT = PROJ / "flyers"
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

# 5 nov: Miami ya salió del horario de verano (UTC-5, como Colombia).
HORAS = [
    "8 P. M. COLOMBIA · MIAMI · PERÚ · ECUADOR",
    "7 P. M. MÉXICO · 9 P. M. VENEZUELA",
    "10 P. M. ARGENTINA Y CHILE",
]

FORMATOS = {
    # medidas en px finales (se multiplican por S)
    "45": dict(H=1350, logo_y=110, eb_y=300, h1_y=380, h1=104, fecha=40, regalo_y=930, regalo=54, horas_y=1100, nota=17),
    "916": dict(H=1920, logo_y=230, eb_y=560, h1_y=650, h1=124, fecha=46, regalo_y=1300, regalo=64, horas_y=1500, nota=20),
}


def background(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h

    def halo(cx, cy, rx, ry, strength, falloff):
        d = np.sqrt(((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2)
        return np.clip(1.0 - d, 0.0, 1.0) ** falloff * strength

    glow = halo(0.5, -0.10, 0.70, 0.40, 0.22, 1.5) + halo(0.5, 0.42, 0.65, 0.30, 0.08, 1.6) + halo(0.5, 1.08, 0.55, 0.30, 0.12, 1.6)
    glow = np.clip(glow, 0, 1)[..., None]
    arr = np.array(BG, np.float32) * (1 - glow) + np.array(GOLD, np.float32) * glow
    grain = np.random.default_rng(7).normal(0, 9, (h, w, 1)).astype(np.float32)
    return Image.fromarray(np.clip(arr + grain, 0, 255).astype(np.uint8))


def tracked(d, cx, y, text, font, fill, tr):
    x = cx - (sum(d.textlength(ch, font=font) for ch in text) + tr * max(len(text) - 1, 0)) / 2
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tr


def build(fmt):
    k = FORMATOS[fmt]
    W1, H1 = 1080, k["H"]
    W, H = W1 * S, H1 * S
    sc = lambda v: int(v * S)
    img = background(W1, H1).resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    cx = W / 2

    # marca
    lp = sc(64)
    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((lp, lp), Image.LANCZOS)
    img.paste(logo, (int(cx - lp / 2), sc(k["logo_y"])), logo)
    tracked(d, cx, sc(k["logo_y"]) + lp + sc(22), "ECOS BUSINESS CLUB", JS(sc(22)), GOLD, sc(7))

    # la clase
    tracked(d, cx, sc(k["eb_y"]), "NUEVO HORARIO DE CLASES", JR(sc(20)), MUTED, sc(6))
    y = sc(k["h1_y"])
    d.text((cx, y), "Hoy, clase de", font=Q(sc(k["h1"] * 0.62)), fill=WHITE, anchor="ma")
    y += int(sc(k["h1"]) * 0.85)
    d.text((cx, y), "oratoria", font=Q(sc(k["h1"])), fill=GOLD, anchor="ma")
    y += int(sc(k["h1"]) * 1.45)
    d.line((cx - sc(40), y, cx + sc(40), y), fill=GOLD, width=sc(2))
    y += sc(44)
    d.text((cx, y), "Jueves 5 de noviembre", font=Q(sc(k["fecha"])), fill=WHITE, anchor="ma")
    y += int(sc(k["fecha"]) * 1.4)
    d.text((cx, y), "8:00 p. m. · hora de Miami", font=JL(sc(k["fecha"] * 0.72)), fill=MUTED, anchor="ma")

    # abajo: el regalo y las horas
    y = sc(k["regalo_y"])
    d.text((cx, y), "7 días de regalo", font=Q(sc(k["regalo"])), fill=GOLD, anchor="ma")
    y += int(sc(k["regalo"]) * 1.35)
    d.text((cx, y), "para los nuevos suscriptores", font=JL(sc(k["regalo"] * 0.52)), fill=WHITE, anchor="ma")
    y = sc(k["horas_y"])
    for i, t in enumerate(HORAS):
        tracked(d, cx, y, t, JR(sc(k["nota"])), WHITE if i == 0 else MUTED, sc(k["nota"]) * 0.22)
        y += int(sc(k["nota"]) * 1.9)

    suffix = {"45": "vertical-4x5", "916": "story-9x16"}[fmt]
    img.resize((W1, H1), Image.LANCZOS).save(OUT / f"ecos-oratoria-2026-11-05-{suffix}.png", optimize=True)
    print(f"  {suffix}: {W1}x{H1}")


print("Generando flyers de la clase de oratoria…")
build("45")
build("916")
