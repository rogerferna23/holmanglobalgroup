# -*- coding: utf-8 -*-
"""Fundadores Elite: tus primeros 2 pasos — HGG (27 oct 2026). Mismo sistema que
generar-flyer-reunion-fundadores.py. Lo que cada fundador hace esta semana, después de la
reunión del 26 oct: 1) agendar su sesión 1 a 1 y 2) su lista de 25 para la masterclass.
Salidas: fundadores-primeros-pasos-vertical-4x5.png y fundadores-primeros-pasos-story-9x16.png."""
import pathlib
from datetime import datetime
from zoneinfo import ZoneInfo
import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT = PROJ / "flyers"
FONTS = pathlib.Path.home() / "Library/Fonts"
S = 2  # supermuestreo

BG = (11, 16, 22)
SURF = (14, 20, 28)
GOLD = (240, 184, 0)
WHITE = (255, 255, 255)
MUTED = (184, 190, 199)
DIM = (107, 115, 128)
LINE = (38, 45, 54)

Q = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px)
JL = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Light.ttf"), px)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px)
JM = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Medium.ttf"), px)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px)

def background(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h

    def halo(cx, cy, rx, ry, strength, falloff):
        d = np.sqrt(((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2)
        return np.clip(1.0 - d, 0.0, 1.0) ** falloff * strength

    glow = halo(0.5, -0.10, 0.70, 0.40, 0.22, 1.5) + halo(0.5, 1.08, 0.55, 0.30, 0.12, 1.6)
    glow = np.clip(glow, 0, 1)[..., None]
    arr = np.array(BG, np.float32)[None, None, :] * (1 - glow) + np.array(GOLD, np.float32)[None, None, :] * glow
    grain = np.random.default_rng(7).normal(0, 18, (h, w, 1)).astype(np.float32) * 0.5
    return Image.fromarray(np.clip(arr + grain, 0, 255).astype(np.uint8), "RGB")


def track_width(d, text, font, tracking):
    return sum(d.textlength(ch, font=font) for ch in text) + tracking * max(len(text) - 1, 0)


def draw_tracked(d, x, y, text, font, fill, tracking, anchor="c"):
    if anchor == "c":
        x -= track_width(d, text, font, tracking) / 2
    elif anchor == "r":
        x -= track_width(d, text, font, tracking)
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking
    return x



PASOS = [
    ("1", "Agenda tu sesión 1 a 1", [
        "Es la primera de las 2 sesiones de tu Programa Fundador:",
        "ahí aterrizamos tu meta y tu plan de noviembre.",
    ], "holmanglobalgroup.com/sesion", "Antes del viernes 30 de octubre"),
    ("2", "Tu lista de 25 para la masterclass", [
        "Escribe 25 personas a las que les sirva aprender a generar",
        "ingresos con un negocio digital. Invítalas con tu enlace:",
    ], "Tu panel · Negocio · «Invita a la masterclass»", "Antes del domingo 1 de noviembre"),
]


def wrap_center(d, cx, y, text, font, fill, lh):
    w = d.textlength(text, font=font)
    d.text((cx - w / 2, y), text, font=font, fill=fill)
    return y + lh


def build(fmt):
    W1, H1 = 1080, {"45": 1350, "916": 1920}[fmt]
    W, H = W1 * S, H1 * S
    img = background(W, H)
    d = ImageDraw.Draw(img)
    cx = W // 2
    sc = lambda v: int(v * S)
    story = fmt == "916"

    pad_top = 120 if story else 56
    logo_px, wm_px, brand_px, elite_px = (42, 14, 50, 26) if story else (34, 12, 40, 22)
    eb_px, h1_px = (22, 76) if story else (16, 54)
    num_px, tit_px, txt_px, link_px, cuando_px = (58, 44, 30, 30, 22) if story else (38, 30, 21, 21, 17)
    pil_px, site_px = (14, 18) if story else (12, 16)
    f_wm, f_brand, f_elite = JR(sc(wm_px)), Q(sc(brand_px)), JL(sc(elite_px))
    f_eb, f_h1 = JS(sc(eb_px)), Q(sc(h1_px))
    f_num, f_tit, f_txt, f_link, f_cuando = Q(sc(num_px)), Q(sc(tit_px)), JL(sc(txt_px)), JM(sc(link_px)), JR(sc(cuando_px))
    f_pil, f_site = JR(sc(pil_px)), JM(sc(site_px))

    # ---------- marca ----------
    y = sc(pad_top)
    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((sc(logo_px), sc(logo_px)), Image.LANCZOS)
    img.paste(logo, (cx - sc(logo_px) // 2, y), logo)
    y += sc(logo_px) + sc(14)
    draw_tracked(d, cx, y, "HOLMAN GLOBAL GROUP LLC", f_wm, MUTED, sc(wm_px) * 0.38)
    y += sc(wm_px) + sc(30)
    draw_tracked(d, cx, y, "FUNDADORES", f_brand, WHITE, sc(brand_px) * 0.12)
    y += sc(brand_px) + sc(16)
    ew = track_width(d, "ELITE", f_elite, sc(elite_px) * 0.45)
    draw_tracked(d, cx, y, "ELITE", f_elite, GOLD, sc(elite_px) * 0.45)
    ly = y + sc(elite_px) * 0.55
    hueco, largo = ew / 2 + sc(18), sc(70)
    d.line((cx - hueco - largo, ly, cx - hueco, ly), fill=GOLD, width=max(1, S))
    d.line((cx + hueco, ly, cx + hueco + largo, ly), fill=GOLD, width=max(1, S))
    y += sc(elite_px) + sc(70 if story else 44)

    # ---------- título ----------
    draw_tracked(d, cx, y, "ESTA SEMANA", f_eb, GOLD, sc(eb_px) * 0.3)
    y += sc(eb_px) + sc(18)
    y = wrap_center(d, cx, y, "Tus primeros 2 pasos", f_h1, WHITE, sc(h1_px) + sc(70 if story else 40))

    # ---------- pasos ----------
    x0, x1 = sc(80), W - sc(80)
    gap = sc(28 if story else 22)
    altura = lambda lineas: (sc(num_px) + sc(18) + sc(tit_px) + sc(18) + len(lineas) * int(sc(txt_px) * 1.5)
                            + sc(16) + sc(link_px) + sc(18) + sc(cuando_px) + sc(56))
    total = sum(altura(p[2]) for p in PASOS) + gap * (len(PASOS) - 1)
    fin = H - sc(160 if story else 96) - sc(40)
    y += max(0, (fin - y - total) // 2)
    for num, tit, lineas, link, cuando in PASOS:
        alto = sc(num_px) + sc(18) + sc(tit_px) + sc(18) + len(lineas) * int(sc(txt_px) * 1.5) + sc(16) + sc(link_px) + sc(18) + sc(cuando_px) + sc(56)
        d.rounded_rectangle([x0, y, x1, y + alto], radius=sc(22), fill=SURF, outline=LINE, width=max(1, S))
        yy = y + sc(28)
        # número en círculo dorado
        r = sc(num_px) * 0.62
        ccx = cx
        d.ellipse([ccx - r, yy, ccx + r, yy + 2 * r], outline=GOLD, width=max(1, S))
        nw = d.textlength(num, font=f_num)
        d.text((ccx - nw / 2, yy + r - sc(num_px) * 0.62), num, font=f_num, fill=GOLD)
        yy += 2 * r + sc(18)
        yy = wrap_center(d, cx, yy, tit, f_tit, WHITE, sc(tit_px) + sc(18))
        for ln in lineas:
            yy = wrap_center(d, cx, yy, ln, f_txt, MUTED, int(sc(txt_px) * 1.5))
        yy += sc(16)
        yy = wrap_center(d, cx, yy, link, f_link, GOLD, sc(link_px) + sc(18))
        draw_tracked(d, cx, yy, cuando.upper(), f_cuando, DIM, sc(cuando_px) * 0.12)
        y += alto + gap

    # ---------- pie ----------
    y = H - sc(160 if story else 96)
    draw_tracked(d, cx, y, "MASTERCLASS · LUNES 2 DE NOVIEMBRE · 8 P. M. COLOMBIA", f_pil, WHITE, sc(pil_px) * 0.3)
    y += int(sc(pil_px) * 1.35) + sc(18)
    d.line([(sc(80), y), (W - sc(80), y)], fill=(30, 36, 43), width=max(1, S // 2))
    y += sc(18)
    draw_tracked(d, cx, y, "holmanglobalgroup.com", f_site, MUTED, sc(site_px) * 0.12)

    suffix = {"45": "vertical-4x5", "916": "story-9x16"}[fmt]
    img.resize((W1, H1), Image.LANCZOS).save(OUT / f"fundadores-primeros-pasos-{suffix}.png", optimize=True)
    print(f"  {suffix}: {W1}x{H1}")


build("45")
build("916")
