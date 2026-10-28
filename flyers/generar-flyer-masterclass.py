# -*- coding: utf-8 -*-
"""Flyer de la masterclass del lun 2 nov 2026 — HGG, en la marca CLARA de
/masterclass (src/styles/masterclass.css, `.sr.mc`): papel #F8F5EF → #E6DFD3,
tinta #0B1016, oro de tinta #9C7600, botón dorado metálico. La foto es el
recorte del traje beige de la landing (public/masterclass/holman-claro.webp),
fundido abajo como en la página. Questrial + Josefin Sans.
Salidas: vertical 4x5 (feed) y story 9x16 (estados e historias).

    python3 -m venv .venv && ./.venv/bin/pip install pillow numpy
    ./.venv/bin/python flyers/generar-flyer-masterclass.py
"""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT = PROJ / "flyers"
FONTS = pathlib.Path.home() / "Library/Fonts"
S = 2  # supermuestreo

TINTA = (11, 16, 22)
TEXTO = (58, 65, 75)
SUAVE = (138, 144, 153)
ORO = (156, 118, 0)
FILETE = (222, 214, 200)

Q = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px)
JL = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Light.ttf"), px)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px)
JM = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Medium.ttf"), px)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px)

# Lo mismo que APRENDES en src/lib/masterclass.ts, en corto para la pieza.
APRENDES = [
    "Convierte lo que sabes en una oferta por la que te paguen",
    "Consigue tus primeros clientes sin pagar publicidad",
    "Vende con naturalidad, sin sentirte vendedor",
]

# 2 nov: Miami ya salió del horario de verano (UTC-5, como Colombia).
HORAS = [
    "8 P. M. COLOMBIA · MIAMI · PERÚ · ECUADOR",
    "7 P. M. MÉXICO · 9 P. M. VENEZUELA · 10 P. M. ARGENTINA Y CHILE",
]

FORMATOS = {
    # medidas en px finales (se multiplican por S)
    "45": dict(H=1350, pad=70, top=54, logo=40, wm=12, foto_h=780, foto_x=0.60, foto_pie=850,
               eb=16, h1=62, txt_y=250, fecha=36, hora_cl=22, pts_y=870, pt=21, horas_y=1128,
               nota=14, btn_y=1206, btn_h=74, btn=22),
    "916": dict(H=1920, pad=70, top=120, logo=48, wm=14, foto_h=1080, foto_x=0.52, foto_pie=1230,
                eb=19, h1=78, txt_y=330, fecha=44, hora_cl=26, pts_y=1260, pt=25, horas_y=1560,
                nota=17, btn_y=1680, btn_h=92, btn=26),
}


def fondo(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h
    a, b, c = np.array([248, 245, 239.]), np.array([241, 236, 227.]), np.array([230, 223, 211.])
    t = nx[..., None]
    lin = np.where(t < 0.6, a + (b - a) * (t / 0.6), b + (c - b) * ((t - 0.6) / 0.4))
    d = np.sqrt(((nx - 0.74) / 0.75) ** 2 + ((ny - 0.30) / 0.45) ** 2)
    luz = (np.clip(1 - d, 0, 1) ** 1.4 * 0.85)[..., None]
    arr = lin * (1 - luz) + np.array([255, 252, 245.]) * luz
    grano = np.random.default_rng(7).normal(0, 5, (h, w, 1)).astype(np.float32)
    return Image.fromarray(np.clip(arr + grano, 0, 255).astype(np.uint8)).convert("RGBA")


def retrato(alto):
    im = Image.open(PROJ / "public/masterclass/holman-claro.webp").convert("RGBA")
    ancho = int(im.width * alto / im.height)
    im = im.resize((ancho, alto), Image.LANCZOS)
    a = np.array(im.getchannel("A"), np.float32)
    y = np.linspace(0, 1, alto)[:, None]
    fade = np.clip((1.0 - y) / 0.20, 0, 1)  # se funde el último 20 %, como la página
    im.putalpha(Image.fromarray((a * fade).astype(np.uint8)))
    return im


def tracked_w(d, t, f, tr):
    return sum(d.textlength(ch, font=f) for ch in t) + tr * max(len(t) - 1, 0)


def tracked(d, x, y, t, f, fill, tr, anchor="c"):
    if anchor == "c":
        x -= tracked_w(d, t, f, tr) / 2
    for ch in t:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tr


def envolver(d, palabras, f, max_w):
    lineas, cur = [], []
    for p in palabras:
        prueba = " ".join([w for w, _ in cur] + [p[0]])
        if cur and d.textlength(prueba, font=f) > max_w:
            lineas.append(cur); cur = []
        cur.append(p)
    if cur:
        lineas.append(cur)
    return lineas


def boton(w, h):
    """Píldora dorada metálica (.sr.mc .ag-btn): #D8B56A → #B8913A → #A07A26 a 135°."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = np.clip((xx / w + yy / h) / 2, 0, 1)[..., None]
    c0, c1, c2 = np.array([216, 181, 106.]), np.array([184, 145, 58.]), np.array([160, 122, 38.])
    col = np.where(t < 0.55, c0 + (c1 - c0) * (t / 0.55), c1 + (c2 - c1) * ((t - 0.55) / 0.45))
    rgba = np.concatenate([col, np.full((h, w, 1), 255.)], axis=2)
    img = Image.fromarray(rgba.astype(np.uint8))
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2, fill=255)
    img.putalpha(m)
    return img


def build(fmt):
    k = FORMATOS[fmt]
    W1, H1 = 1080, k["H"]
    W, H = W1 * S, H1 * S
    sc = lambda v: int(v * S)
    img = fondo(W, H)
    cx, pad = W // 2, sc(k["pad"])

    # foto a la derecha, apoyada sobre el filete de «lo que te llevas»
    foto = retrato(sc(k["foto_h"]))
    img.alpha_composite(foto, (int(W * k["foto_x"]), sc(k["foto_pie"]) - foto.height))
    d = ImageDraw.Draw(img)

    # marca
    y = sc(k["top"])
    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((sc(k["logo"]),) * 2, Image.LANCZOS)
    img.alpha_composite(logo, (pad, y))
    tracked(d, pad + sc(k["logo"]) + sc(16), y + (sc(k["logo"]) - sc(k["wm"])) // 2,
            "HOLMAN GLOBAL GROUP LLC", JR(sc(k["wm"])), SUAVE, sc(k["wm"]) * 0.38, anchor="l")

    # texto
    y = sc(k["txt_y"])
    tracked(d, pad, y, "MASTERCLASS GRATUITA · EN VIVO", JS(sc(k["eb"])), ORO, sc(k["eb"]) * 0.28, anchor="l")
    y += sc(k["eb"]) + sc(26)
    f_h1 = Q(sc(k["h1"]))
    palabras = [(w, TINTA) for w in "Cómo generar ingresos con".split()] + \
               [(w, ORO) for w in "negocios digitales".split()]
    for linea in envolver(d, palabras, f_h1, int(W * 0.50) - pad):
        x = pad
        for w, col in linea:
            d.text((x, y), w, font=f_h1, fill=col)
            x += d.textlength(w + " ", font=f_h1)
        y += int(sc(k["h1"]) * 1.14)
    y += sc(30)
    d.line([(pad, y), (pad + sc(56), y)], fill=ORO, width=sc(2))
    y += sc(28)
    d.text((pad, y), "Lunes 2 de noviembre", font=Q(sc(k["fecha"])), fill=TINTA)
    y += int(sc(k["fecha"]) * 1.3)
    d.text((pad, y), "8:00 p. m. · hora de Colombia", font=JL(sc(k["hora_cl"])), fill=TEXTO)

    # lo que te llevas: tres columnas con filete arriba (como .mc-puntos)
    y = sc(k["pts_y"])
    d.line([(pad, y), (W - pad, y)], fill=FILETE, width=S)
    y += sc(34)
    tracked(d, pad, y, "LO QUE TE LLEVAS", JS(sc(k["nota"])), ORO, sc(k["nota"]) * 0.3, anchor="l")
    y += sc(k["nota"]) + sc(24)
    gap = sc(30)
    cw = (W - pad * 2 - gap * 2) // 3
    f_pt, f_n = JR(sc(k["pt"])), Q(sc(k["pt"] + 6))
    for i, t in enumerate(APRENDES):
        x0 = pad + i * (cw + gap)
        if i:
            d.line([(x0 - gap // 2, y), (x0 - gap // 2, y + sc(k["pt"]) * 5)], fill=FILETE, width=S)
        d.text((x0, y), f"0{i + 1}", font=f_n, fill=ORO)
        yy = y + int(sc(k["pt"] + 6) * 1.5)
        for linea in envolver(d, [(w, TINTA) for w in t.split()], f_pt, cw - sc(8)):
            d.text((x0, yy), " ".join(w for w, _ in linea), font=f_pt, fill=TINTA)
            yy += int(sc(k["pt"]) * 1.32)

    # horas por país
    y = sc(k["horas_y"])
    f_nota = JM(sc(k["nota"]))
    tracked(d, cx, y, HORAS[0], f_nota, TINTA, sc(k["nota"]) * 0.22)
    tracked(d, cx, y + int(sc(k["nota"]) * 1.8), HORAS[1], f_nota, TEXTO, sc(k["nota"]) * 0.22)

    # botón de registro
    y = sc(k["btn_y"])
    f_b = JS(sc(k["btn"]))
    t = "Regístrate gratis en holmanglobalgroup.com/masterclass"
    bw = int(d.textlength(t, font=f_b) + sc(k["btn_h"]) * 1.2)
    b = boton(bw, sc(k["btn_h"]))
    img.alpha_composite(b, (cx - bw // 2, y))
    d = ImageDraw.Draw(img)
    d.text((cx, y + sc(k["btn_h"]) // 2), t, font=f_b, fill=(255, 252, 244), anchor="mm")

    suffix = {"45": "vertical-4x5", "916": "story-9x16"}[fmt]
    img.convert("RGB").resize((W1, H1), Image.LANCZOS).save(OUT / f"masterclass-2026-11-02-{suffix}.png", optimize=True)
    print(f"  {suffix}: {W1}x{H1}")


print("Generando flyers de la masterclass (marca clara)…")
build("45")
build("916")
