# -*- coding: utf-8 -*-
"""Historia de la Sesión de Claridad — HGG (29 oct 2026). Va justo después del testimonio de
Genaro (de un 7 a un 9) y deja un hueco para el sticker de enlace de Instagram hacia WhatsApp.
Mismo fondo y tipografías que generar-historia-clase.py.
Uso: python generar-historia-claridad.py
Salida: claridad-7-a-9-story-9x16.png (1080×1920)."""
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


def build():
    img = background()
    d = ImageDraw.Draw(img)

    # Encabezado (debajo de la zona que tapa la barra de Instagram)
    y = 300 * S
    draw_tracked(d, W / 2, y, "SESIÓN DE CLARIDAD · GRATUITA", JS(24), GOLD, 7 * S)

    # El 7 → 9 del testimonio
    y += 70 * S
    # Las fuentes de marca no traen la flecha: va dibujada
    f_num = Q(230)
    flecha, aire = 120 * S, 50 * S
    w7, w9 = d.textlength("7", font=f_num), d.textlength("9", font=f_num)
    x = W / 2 - (w7 + w9 + flecha + 2 * aire) / 2
    d.text((x, y), "7", font=f_num, fill=WHITE)
    ax0 = x + w7 + aire
    ay = y + 140 * S
    d.line((ax0, ay, ax0 + flecha - 6 * S, ay), fill=DIM, width=5 * S)
    d.polygon([(ax0 + flecha, ay), (ax0 + flecha - 30 * S, ay - 20 * S), (ax0 + flecha - 30 * S, ay + 20 * S)], fill=DIM)
    d.text((ax0 + flecha + aire, y), "9", font=f_num, fill=GOLD)
    y += 270 * S
    center(d, y, "Así llegó Genaro y así se fue.", JL(34), MUTED)

    # Pregunta
    y += 120 * S
    d.line((W / 2 - 40 * S, y, W / 2 + 40 * S, y), fill=GOLD, width=2 * S)
    y += 60 * S
    for linea, color in [("¿Y tú, del 1 al 10,", WHITE), ("qué tan claro tienes", GOLD), ("tu siguiente paso?", GOLD)]:
        center(d, y, linea, Q(70), color)
        y += 88 * S

    y += 40 * S
    for linea in ["En 30 minutos por Zoom, Holman o alguien", "de su equipo te ayuda a ver dónde estás hoy", "y qué hacer para avanzar con un plan claro."]:
        center(d, y, linea, JL(34), MUTED)
        y += 50 * S

    # Hueco para el sticker de enlace
    y += 70 * S
    draw_tracked(d, W / 2, y, "TOCA EL ENLACE Y ESCRÍBENOS", JS(22), GOLD, 6 * S)
    y += 56 * S
    d.line((W / 2, y, W / 2, y + 34 * S), fill=GOLD, width=3 * S)
    d.polygon([(W / 2, y + 48 * S), (W / 2 - 14 * S, y + 28 * S), (W / 2 + 14 * S, y + 28 * S)], fill=GOLD)

    # WhatsApp por si no toca el enlace
    y = 1560 * S
    center(d, y, "o escribe «Quiero mi Sesión de Claridad» al", JL(28), MUTED)
    y += 46 * S
    center(d, y, "+57 323 910 3261", Q(44), WHITE)

    # Firma
    logo_px = 46 * S
    y = 1720 * S
    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((logo_px, logo_px), Image.LANCZOS)
    img.paste(logo, (W // 2 - logo_px // 2, y), logo)
    draw_tracked(d, W / 2, y + logo_px + 16 * S, "HOLMAN GLOBAL GROUP", JR(16), DIM, 5 * S)

    out = OUT / "claridad-7-a-9-story-9x16.png"
    img.resize((W // S, H // S), Image.LANCZOS).save(out, optimize=True)
    print(out)


if __name__ == "__main__":
    build()
