# -*- coding: utf-8 -*-
"""Foto de la reunión de Fundadores Elite (3 nov 2026) con la marca de HGG.
Toma la captura de Zoom, recorta a cada persona sin la interfaz (botones, íconos de
micrófono, nombres de Zoom) y los pone en tarjetas sobre el fondo oscuro con halo dorado.
Uso: python3 generar-foto-reunion-fundadores.py <captura.png>
Salidas: fundadores-elite-reunion-vertical-4x5.png, -story-9x16.png, -horizontal-16x9.png"""
import pathlib
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

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
JM = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Medium.ttf"), px)

# Recortes en coordenadas de la captura reducida a 1600 px de ancho (proporción 4:5).
# Holman va en el centro de la composición.
PERSONAS = [
    ("Zacarías", (108, 17, 318, 280)),
    ("Ida", (1160, 20, 1370, 283)),
    ("Marisol", (1290, 310, 1500, 573)),
    ("Elizabeth", (290, 310, 500, 573)),
    ("Holman", (695, 21, 905, 284)),
    ("Evelyn", (705, 310, 915, 573)),
    ("Genaro", (459, 620, 621, 822)),
    ("José de Jesús", (976, 628, 1138, 830)),
]


def background(w, h):
    """Fondo #0B1016 con halo dorado arriba y grano suave (solo PIL)."""
    img = Image.new("RGB", (w, h), BG)
    halo = Image.new("L", (w, h), 0)
    ImageDraw.Draw(halo).ellipse((w * -0.25, h * -0.23, w * 1.25, h * 0.47), fill=70)
    halo = halo.filter(ImageFilter.GaussianBlur(w * 0.18))
    img = Image.composite(Image.new("RGB", (w, h), (70, 52, 14)), img, halo)
    ruido = Image.effect_noise((w, h), 22).point(lambda v: v)
    grano = Image.merge("RGB", (ruido, ruido, ruido))
    return Image.blend(img, grano, 0.035)


def recorte(src, box, w, h):
    k = src.width / 1600
    x0, y0, x1, y1 = [round(v * k) for v in box]
    im = src.crop((x0, y0, x1, y1))
    # ajustar a la proporción exacta de la tarjeta, centrado
    r = w / h
    if im.width / im.height > r:
        nw = round(im.height * r)
        off = (im.width - nw) // 2
        im = im.crop((off, 0, off + nw, im.height))
    else:
        nh = round(im.width / r)
        off = (im.height - nh) // 2
        im = im.crop((0, off, im.width, off + nh))
    return im.resize((w, h), Image.LANCZOS)


def tarjeta(canvas, src, nombre, box, x, y, w, h, fs):
    rad = int(w * 0.06)
    foto = recorte(src, box, w, h).convert("RGBA")
    # degradado inferior para el nombre
    grad = Image.new("L", (1, h))
    for i in range(h):
        t = max(0, (i - h * 0.62) / (h * 0.38))
        grad.putpixel((0, i), int(220 * t ** 1.4))
    sombra = Image.new("RGBA", (w, h), BG + (0,))
    sombra.putalpha(grad.resize((w, h)))
    foto = Image.alpha_composite(foto, sombra)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), rad, fill=255)
    canvas.paste(foto, (x, y), mask)
    d = ImageDraw.Draw(canvas, "RGBA")
    d.rounded_rectangle((x, y, x + w - 1, y + h - 1), rad,
                        outline=GOLD + (110,), width=max(2, S))
    f = JM(fs)
    tw = d.textlength(nombre, font=f)
    d.text((x + (w - tw) / 2, y + h - fs * 1.9), nombre, font=f, fill=WHITE)


def centrado(d, cx, y, txt, font, fill, spacing=0):
    if spacing:
        chars = list(txt)
        tw = sum(d.textlength(c, font=font) for c in chars) + spacing * (len(chars) - 1)
        x = cx - tw / 2
        for c in chars:
            d.text((x, y), c, font=font, fill=fill)
            x += d.textlength(c, font=font) + spacing
        return tw
    tw = d.textlength(txt, font=font)
    d.text((cx - tw / 2, y), txt, font=font, fill=fill)
    return tw


def cabecera(d, cx, y, u):
    """u = unidad de tamaño. Devuelve la y donde termina."""
    centrado(d, cx, y, "HOLMAN GLOBAL GROUP", JR(int(u * 0.55)), MUTED, spacing=u * 0.32)
    y += u * 1.5
    centrado(d, cx, y, "FUNDADORES", Q(int(u * 2.3)), WHITE, spacing=u * 0.28)
    y += u * 3.0
    fe = JL(int(u * 1.05))
    tw = centrado(d, cx, y, "ELITE", fe, GOLD, spacing=u * 0.9)
    ly = y + u * 0.55
    gap, ln = u * 0.9, u * 2.6
    d.line((cx - tw / 2 - gap - ln, ly, cx - tw / 2 - gap, ly), fill=GOLD, width=max(2, S))
    d.line((cx + tw / 2 + gap, ly, cx + tw / 2 + gap + ln, ly), fill=GOLD, width=max(2, S))
    y += u * 2.1
    centrado(d, cx, y, "Socios estratégicos  ·  Noviembre 2026", JL(int(u * 0.72)), MUTED)
    return y + u * 1.2


def pie(d, cx, y, u):
    centrado(d, cx, y, "Construimos juntos lo que ninguno lograría solo.", JL(int(u * 0.78)), WHITE)
    centrado(d, cx, y + u * 1.35, "holmanglobalgroup.com", JR(int(u * 0.52)), DIM, spacing=u * 0.12)


def componer(src, W, H, cols, u, margen, gap, nombre_fs, nombre):
    W, H = W * S, H * S
    u, margen, gap, nombre_fs = u * S, margen * S, gap * S, nombre_fs * S
    canvas = background(W, H).convert("RGBA")
    d = ImageDraw.Draw(canvas, "RGBA")
    filas = [PERSONAS[i:i + cols] for i in range(0, len(PERSONAS), cols)]
    cw = int((W - 2 * margen - gap * (cols - 1)) / cols)
    ch = int(cw * 1.25)
    alto_grid = len(filas) * ch + (len(filas) - 1) * gap
    alto_cab = u * 8.0
    alto_pie = u * 2.4
    libre = H - alto_grid - alto_cab - alto_pie
    y = libre * 0.42
    cabecera(d, W / 2, y, u)
    gy = y + alto_cab + libre * 0.12
    for r, fila in enumerate(filas):
        fw = len(fila) * cw + (len(fila) - 1) * gap
        x0 = (W - fw) / 2
        for c, (n, box) in enumerate(fila):
            tarjeta(canvas, src, n, box, int(x0 + c * (cw + gap)), int(gy + r * (ch + gap)),
                    cw, ch, nombre_fs)
    d = ImageDraw.Draw(canvas, "RGBA")
    pie(d, W / 2, gy + alto_grid + libre * 0.2, u)
    out = canvas.convert("RGB").resize((W // S, H // S), Image.LANCZOS)
    out.save(OUT / nombre, quality=95)
    print("ok", OUT / nombre)


def componer_captura(src, W, H, u, margen, nombre):
    """La captura completa de Zoom, tal cual, enmarcada con la marca."""
    W, H, u, margen = W * S, H * S, u * S, margen * S
    canvas = background(W, H).convert("RGBA")
    d = ImageDraw.Draw(canvas, "RGBA")
    iw = W - 2 * margen
    ih = round(iw * src.height / src.width)
    alto_cab, alto_pie = u * 8.0, u * 2.4
    libre = H - ih - alto_cab - alto_pie
    y = libre * 0.42
    cabecera(d, W / 2, y, u)
    gy = int(y + alto_cab + libre * 0.12)
    foto = src.resize((iw, ih), Image.LANCZOS)
    rad = int(iw * 0.018)
    mask = Image.new("L", (iw, ih), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, iw - 1, ih - 1), rad, fill=255)
    canvas.paste(foto, (margen, gy), mask)
    d = ImageDraw.Draw(canvas, "RGBA")
    d.rounded_rectangle((margen, gy, margen + iw - 1, gy + ih - 1), rad,
                        outline=GOLD + (140,), width=max(2, S))
    pie(d, W / 2, gy + ih + libre * 0.2, u)
    out = canvas.convert("RGB").resize((W // S, H // S), Image.LANCZOS)
    out.save(OUT / nombre, quality=95)
    print("ok", OUT / nombre)


def ordenar(cols):
    """Holman al centro según el número de columnas."""
    global PERSONAS
    base = {n: b for n, b in PERSONAS}
    if cols == 4:
        orden = ["Zacarías", "Ida", "Marisol", "Elizabeth",
                 "Evelyn", "Holman", "Genaro", "José de Jesús"]
    else:  # 3
        orden = ["Zacarías", "Ida", "Marisol",
                 "Elizabeth", "Holman", "Evelyn",
                 "Genaro", "José de Jesús"]
    return [(n, base[n]) for n in orden]


if __name__ == "__main__":
    src = Image.open(sys.argv[1]).convert("RGB")
    todos = PERSONAS
    PERSONAS = ordenar(4)
    componer(src, 1080, 1350, 4, 40, 60, 14, 19, "fundadores-elite-reunion-vertical-4x5.png")
    componer(src, 1920, 1080, 4, 32, 470, 16, 18, "fundadores-elite-reunion-horizontal-16x9.png")
    PERSONAS = ordenar(3)
    componer(src, 1080, 1920, 3, 46, 70, 18, 24, "fundadores-elite-reunion-story-9x16.png")
    # Versión con la captura completa, tal cual
    componer_captura(src, 1080, 1350, 40, 40, "fundadores-elite-captura-vertical-4x5.png")
    componer_captura(src, 1080, 1920, 46, 40, "fundadores-elite-captura-story-9x16.png")
    componer_captura(src, 1920, 1080, 30, 450, "fundadores-elite-captura-horizontal-16x9.png")
