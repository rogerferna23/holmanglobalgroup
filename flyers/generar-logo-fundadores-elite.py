# -*- coding: utf-8 -*-
"""Logo del grupo Fundadores Elite — HGG (oct 2026). Mismo sistema que los flyers:
fondo oscuro con halo dorado, solo texto centrado, Questrial + Josefin Sans.
Todo cabe dentro del círculo que recorta WhatsApp en la foto del grupo.
Salida: flyers/fundadores-elite-logo.png (1080x1080)."""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT = PROJ / "flyers"
FONTS = pathlib.Path.home() / "Library/Fonts"
S = 2  # supermuestreo
W = 1080 * S

BG = (11, 16, 22)
GOLD = (240, 184, 0)
WHITE = (255, 255, 255)
LINE = (205, 146, 58)

Q = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px)
JL = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Light.ttf"), px)


def background():
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
    c = W / 2
    r = np.sqrt((xx - c) ** 2 + (yy - c) ** 2) / W
    halo = np.exp(-(r ** 2) / (2 * 0.20 ** 2))
    img = np.zeros((W, W, 3), np.float32)
    for i, (b, g) in enumerate(zip(BG, (70, 46, 14))):
        img[..., i] = b + g * halo
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert("RGBA")


def elefante(ancho):
    """El elefante del logo de HGG, sin el aro."""
    src = Image.open(PROJ / "public/logo-elefante.png").convert("RGBA")
    n = src.size[0]
    yy, xx = np.mgrid[0:n, 0:n]
    dentro = np.sqrt((xx - n / 2) ** 2 + (yy - n / 2) ** 2) < n * 0.36
    a = np.array(src)
    a[..., 3] = np.where(dentro, a[..., 3], 0)
    el = Image.fromarray(a)
    el = el.crop(el.getbbox())
    alto = int(el.size[1] * ancho / el.size[0])
    return el.resize((ancho, alto), Image.LANCZOS)


def texto_espaciado(d, cy, txt, font, fill, track):
    anchos = [d.textlength(ch, font=font) for ch in txt]
    total = sum(anchos) + track * (len(txt) - 1)
    x = (W - total) / 2
    for ch, w in zip(txt, anchos):
        d.text((x, cy), ch, font=font, fill=fill, anchor="lm")
        x += w + track
    return total


img = background()
d = ImageDraw.Draw(img)
c = W / 2

# Aro fino dentro de la zona segura del círculo de WhatsApp
R = W * 0.43
d.ellipse((c - R, c - R, c + R, c + R), outline=LINE + (150,), width=3 * S)

d = ImageDraw.Draw(img)
texto_espaciado(d, W * 0.47, "FUNDADORES", Q(84 * S), WHITE, 10 * S)
yl = W * 0.565
ancho = texto_espaciado(d, yl, "ELITE", JL(54 * S), GOLD, 24 * S)
hueco, largo = ancho / 2 + 28 * S, 120 * S
d.line((c - hueco - largo, yl, c - hueco, yl), fill=GOLD, width=2 * S)
d.line((c + hueco, yl, c + hueco + largo, yl), fill=GOLD, width=2 * S)

img.convert("RGB").resize((1080, 1080), Image.LANCZOS).save(OUT / "fundadores-elite-logo.png")
print("listo")
