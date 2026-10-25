# -*- coding: utf-8 -*-
"""Flyer de la reunión de Fundadores Elite — HGG (26 oct 2026). Mismo sistema que
generar-flyer-programa-fundador.py: fondo oscuro con halo dorado, Questrial + Josefin Sans.
Tabla de horas por país calculada con zoneinfo para la fecha exacta (Europa ya en horario
de invierno desde el 25 oct; EE. UU. en horario de verano hasta el 1 nov; México sin cambio).
Salidas: fundadores-reunion-story-9x16.png y fundadores-reunion-vertical-4x5.png."""
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

REUNION = datetime(2026, 10, 26, 20, 0, tzinfo=ZoneInfo("America/Bogota"))

# (país o ciudad, zona IANA). La primera fila se resalta en dorado.
PAISES = [
    ("Colombia", "America/Bogota"),
    ("Ecuador", "America/Guayaquil"),
    ("México", "America/Mexico_City"),
    ("Miami (EE. UU.)", "America/New_York"),
    ("Bolivia", "America/La_Paz"),
    ("Brasil (Caxias do Sul)", "America/Sao_Paulo"),
]

DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def hora(zona):
    t = REUNION.astimezone(ZoneInfo(zona))
    h = t.hour % 12 or 12
    txt = f"{h}:{t.minute:02d} {'a.m.' if t.hour < 12 else 'p.m.'}"
    otro_dia = f"{DIAS[t.weekday()]} {t.day}" if t.date() != REUNION.date() else None
    return txt, otro_dia


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


def build(fmt):
    W1, H1 = 1080, {"45": 1350, "916": 1920}[fmt]
    W, H = W1 * S, H1 * S
    img = background(W, H)
    d = ImageDraw.Draw(img)
    cx = W // 2
    sc = lambda v: int(v * S)
    n = len(PAISES)

    if fmt == "45":
        pad_top, pad_x, pad_bot = 56, 80, 50
        logo_px, wm_px, brand_px, elite_px = 34, 12, 40, 22
        eb_px, h1_px, big_px, sub_px = 16, 54, 96, 20
        th_px, row_px, note_px, pil_px, site_px = 13, 26, 19, 12, 16
        row_h = min(64, int(560 / max(n, 1)))
        huecos = {"marca_titulo": (40, 1.0), "titulo_hora": (24, 0.6), "hora_tabla": (40, 1.0),
                  "tabla_nota": (30, 0.8), "nota_pie": (34, 1.0)}
    else:
        pad_top, pad_x, pad_bot = 120, 80, 200
        logo_px, wm_px, brand_px, elite_px = 42, 14, 50, 26
        eb_px, h1_px, big_px, sub_px = 18, 64, 116, 24
        th_px, row_px, note_px, pil_px, site_px = 15, 30, 22, 14, 18
        row_h = min(84, int(820 / max(n, 1)))
        huecos = {"marca_titulo": (60, 1.0), "titulo_hora": (34, 0.6), "hora_tabla": (60, 1.0),
                  "tabla_nota": (44, 0.8), "nota_pie": (50, 1.0)}

    f_wm, f_brand, f_elite = JR(sc(wm_px)), Q(sc(brand_px)), JL(sc(elite_px))
    f_eb, f_h1, f_big, f_sub = JS(sc(eb_px)), Q(sc(h1_px)), Q(sc(big_px)), JL(sc(sub_px))
    f_th, f_row, f_rowl, f_note = JS(sc(th_px)), JM(sc(row_px)), JL(sc(row_px)), JR(sc(note_px))
    f_pil, f_site, f_day = JR(sc(pil_px)), JM(sc(site_px)), JL(sc(row_px * 0.62))

    # ---------- medir ----------
    logo_gap = sc(14)
    marca_h = sc(logo_px) + logo_gap + sc(wm_px) + sc(34) + sc(brand_px) + sc(16) + sc(elite_px)
    titulo_h = sc(eb_px) + sc(20) + sc(h1_px)
    hora_h = sc(big_px) + sc(16) + sc(sub_px)
    tabla_h = sc(th_px) + sc(18) + sc(row_h) * n
    nota_h = sc(note_px)
    pie_h = 1 + sc(22) + int(sc(pil_px) * 1.35) + sc(6) + int(sc(site_px) * 1.35)

    bloques = marca_h + titulo_h + hora_h + tabla_h + nota_h + pie_h
    sobra = H - sc(pad_top) - sc(pad_bot) - bloques - sum(sc(m) for m, _ in huecos.values())
    if sobra < 0:
        print(f"    ¡ojo! en {fmt} faltan {int(-sobra / S)} px")
        sobra = 0
    pt = sum(w for _, w in huecos.values())
    g = {k: sc(m) + sobra * w / pt for k, (m, w) in huecos.items()}

    # ---------- marca ----------
    y = sc(pad_top)
    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((sc(logo_px), sc(logo_px)), Image.LANCZOS)
    img.paste(logo, (cx - sc(logo_px) // 2, y), logo)
    y += sc(logo_px) + logo_gap
    draw_tracked(d, cx, y, "HOLMAN GLOBAL GROUP LLC", f_wm, MUTED, sc(wm_px) * 0.38)
    y += sc(wm_px) + sc(34)
    draw_tracked(d, cx, y, "FUNDADORES", f_brand, WHITE, sc(brand_px) * 0.12)
    y += sc(brand_px) + sc(16)
    ew = track_width(d, "ELITE", f_elite, sc(elite_px) * 0.45)
    draw_tracked(d, cx, y, "ELITE", f_elite, GOLD, sc(elite_px) * 0.45)
    ly = y + sc(elite_px) * 0.55
    hueco, largo = ew / 2 + sc(18), sc(70)
    d.line((cx - hueco - largo, ly, cx - hueco, ly), fill=GOLD, width=max(1, S))
    d.line((cx + hueco, ly, cx + hueco + largo, ly), fill=GOLD, width=max(1, S))
    y += sc(elite_px) + g["marca_titulo"]

    # ---------- título ----------
    draw_tracked(d, cx, y, "REUNIÓN DEL EQUIPO · EN VIVO", f_eb, GOLD, sc(eb_px) * 0.3)
    y += sc(eb_px) + sc(20)
    tw = d.textlength("Lunes 26 de octubre", font=f_h1)
    d.text((cx - tw / 2, y), "Lunes 26 de octubre", font=f_h1, fill=WHITE)
    y += sc(h1_px) + g["titulo_hora"]

    # ---------- hora principal ----------
    big, _ = hora("America/Bogota")
    bw = d.textlength(big, font=f_big)
    d.text((cx - bw / 2, y), big, font=f_big, fill=GOLD)
    y += sc(big_px) + sc(16)
    draw_tracked(d, cx, y, "hora Colombia", f_sub, MUTED, sc(sub_px) * 0.1)
    y += sc(sub_px) + g["hora_tabla"]

    # ---------- tabla ----------
    x0, x1 = sc(pad_x), W - sc(pad_x)
    draw_tracked(d, x0 + sc(28), y, "TU PAÍS", f_th, DIM, sc(th_px) * 0.3, anchor="l")
    draw_tracked(d, x1 - sc(28), y, "TU HORA", f_th, DIM, sc(th_px) * 0.3, anchor="r")
    y += sc(th_px) + sc(18)
    rh = sc(row_h)
    caja_pad = sc(6)
    d.rounded_rectangle([x0, y - caja_pad, x1, y + rh * n + caja_pad], radius=sc(18), fill=SURF, outline=LINE,
                        width=max(1, S))
    for i, (pais, zona) in enumerate(PAISES):
        ry = y + rh * i
        if i:
            d.line((x0 + sc(28), ry, x1 - sc(28), ry), fill=LINE, width=max(1, S // 2))
        txt, otro_dia = hora(zona)
        col = GOLD if i == 0 else WHITE
        ty = ry + (rh - sc(row_px)) / 2 - sc(2)
        d.text((x0 + sc(28), ty), pais, font=f_rowl if i else f_row, fill=col if i == 0 else MUTED)
        tw = d.textlength(txt, font=f_row)
        d.text((x1 - sc(28) - tw, ty), txt, font=f_row, fill=col)
        if otro_dia:
            dw = d.textlength(otro_dia, font=f_day)
            d.text((x1 - sc(28) - tw - sc(14) - dw, ty + sc(row_px) * 0.3), otro_dia, font=f_day, fill=GOLD)
    y += rh * n + caja_pad + g["tabla_nota"]

    # ---------- nota ----------
    draw_tracked(d, cx, y, "El enlace llega por el grupo  ·  Te espero con tu meta", f_note, WHITE, sc(note_px) * 0.06)
    y += sc(note_px) + g["nota_pie"]

    # ---------- pie ----------
    d.line([(sc(pad_x), y), (W - sc(pad_x), y)], fill=(30, 36, 43), width=max(1, S // 2))
    y += 1 + sc(22)
    draw_tracked(d, cx, y, "SENTIDO · MARCA · SISTEMA", f_pil, DIM, sc(pil_px) * 0.36)
    y += int(sc(pil_px) * 1.35) + sc(6)
    draw_tracked(d, cx, y, "holmanglobalgroup.com", f_site, MUTED, sc(site_px) * 0.12)

    suffix = {"45": "vertical-4x5", "916": "story-9x16"}[fmt]
    img.resize((W1, H1), Image.LANCZOS).save(OUT / f"fundadores-reunion-{suffix}.png", optimize=True)
    print(f"  {suffix}: {W1}x{H1}")


print("Horas de la reunión:")
for pais, zona in PAISES:
    print(f"  {pais:28s} {' '.join(x for x in hora(zona) if x)}")
build("45")
build("916")
