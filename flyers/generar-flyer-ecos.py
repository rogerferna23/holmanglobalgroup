# -*- coding: utf-8 -*-
"""Flyers de ECOS Business Club — paleta y tipografías de HGG.

Tres formatos desde el mismo diseño:
  4x5  (1080x1350) feed de Instagram y Facebook, grupos de WhatsApp
  1x1  (1080x1080) publicaciones cuadradas
  9x16 (1080x1920) estados de WhatsApp y stories

La pieza no lleva retrato: aquí lo que se vende es el club, no la persona. La
placa ECOS hace de ancla visual, igual que en el sitio.

    python3 flyers/generar-flyer-ecos.py
"""
import pathlib
import numpy as np
import segno
from PIL import Image, ImageDraw, ImageFont

PROJ  = pathlib.Path(__file__).resolve().parent.parent
OUT   = PROJ / "flyers"
FONTS = pathlib.Path.home() / "Library/Fonts"
S = 2  # supermuestreo

BG    = (11, 16, 22)
GOLD  = (240, 184, 0)
WHITE = (255, 255, 255)
MUTED = (184, 190, 199)
DIM   = (107, 115, 128)

Q  = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px)
JL = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Light.ttf"), px)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px)
JM = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Medium.ttf"), px)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px)

URL = "https://holmanglobalgroup.com/ecos"

MATERIAS = [
    ("VENTAS",    "que alguien decida"),
    ("MARKETING", "que te encuentren"),
    ("ORATORIA",  "que te crean"),
]


def background(w, h):
    """Fondo oscuro con halo dorado arriba, rescoldo abajo y grano de película."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h

    def halo(cx, cy, rx, ry, strength, falloff):
        d = np.sqrt(((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2)
        return np.clip(1.0 - d, 0.0, 1.0) ** falloff * strength

    glow = halo(0.5, -0.10, 0.70, 0.40, 0.22, 1.5) + halo(0.5, 1.08, 0.55, 0.30, 0.12, 1.6)
    glow = np.clip(glow, 0, 1)[..., None]
    arr = np.array(BG, np.float32)[None, None, :] * (1 - glow) + np.array(GOLD, np.float32)[None, None, :] * glow
    rng = np.random.default_rng(7)
    arr = np.clip(arr + rng.normal(0, 18, (h, w, 1)).astype(np.float32) * 0.5, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def track_w(d, text, font, tracking):
    return sum(d.textlength(c, font=font) for c in text) + tracking * max(len(text) - 1, 0)


def tracked(d, cx, y, text, font, fill, tracking):
    """Texto centrado con letter-spacing manual: PIL no lo trae."""
    x = cx - track_w(d, text, font, tracking) / 2
    for c in text:
        d.text((x, y), c, font=font, fill=fill)
        x += d.textlength(c, font=font) + tracking


def placa(size):
    """La placa ECOS: marco dorado fino sobre fondo apenas más claro."""
    SS = 2
    D = size * SS
    img = Image.new("RGBA", (D, D), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(D * 0.16)
    d.rounded_rectangle([0, 0, D - 1, D - 1], radius=r, fill=(17, 24, 32, 255))
    d.rounded_rectangle([0, 0, D - 1, D - 1], radius=r, outline=(205, 146, 58, 190), width=int(2.2 * SS))

    f1 = Q(int(D * 0.26))
    f2 = JL(int(D * 0.088))
    b1 = d.textbbox((0, 0), "ECOS", font=f1)
    w1, h1 = b1[2] - b1[0], b1[3] - b1[1]
    y = D / 2 - h1 * 0.78
    d.text((D / 2 - w1 / 2 - b1[0], y - b1[1]), "ECOS", font=f1, fill=WHITE)
    tracked(d, D / 2, y + h1 + int(D * 0.055), "BUSINESS CLUB", f2, GOLD, int(D * 0.022))
    return img.resize((size, size), Image.LANCZOS)


def qr(px):
    q = segno.make(URL, error="m")
    tmp = OUT / f".qr-ecos-{px}.png"
    q.save(str(tmp), scale=px, border=4, dark="#0B1016", light="#FFFFFF")
    img = Image.open(tmp).convert("RGB")
    tmp.unlink()
    return img


def build(fmt):
    W1 = 1080
    H1 = {"45": 1350, "11": 1080, "916": 1920}[fmt]
    W, H = W1 * S, H1 * S
    img = background(W, H)
    d = ImageDraw.Draw(img)
    cx = W // 2

    esc = {"45": 1.0, "11": 0.86, "916": 1.10}[fmt]
    p = lambda v: int(v * S * esc)
    # El 9x16 es mucho más alto que ancho: sin repartir más aire entre bloques, el
    # contenido se apelmaza arriba y queda un vacío antes del pie.
    sep = {"45": 1.0, "11": 0.88, "916": 1.62}[fmt]
    g = lambda v: int(v * S * esc * sep)

    pad_top = p({"45": 92, "11": 74, "916": 110}[fmt])
    pad_bot = p({"45": 74, "11": 60, "916": 120}[fmt])

    y = pad_top

    # Placa
    pl = placa(p(196))
    img.paste(pl, (cx - pl.width // 2, y), pl)
    y += pl.height + g(46)

    # Titular
    f_h1 = Q(p(52))
    for linea in ["Las habilidades que", "tu negocio necesita."]:
        b = d.textbbox((0, 0), linea, font=f_h1)
        d.text((cx - (b[2] - b[0]) / 2 - b[0], y - b[1]), linea, font=f_h1, fill=WHITE)
        y += p(64)
    y += g(14)

    f_lead = JL(p(27))
    lead = "Vender, marketing y oratoria son la misma habilidad: comunicar."
    palabras, linea, lineas = lead.split(), "", []
    maxw = W - p(150) * 2
    for w_ in palabras:
        t = (linea + " " + w_).strip()
        if d.textlength(t, font=f_lead) > maxw and linea:
            lineas.append(linea); linea = w_
        else:
            linea = t
    lineas.append(linea)
    for l in lineas:
        b = d.textbbox((0, 0), l, font=f_lead)
        d.text((cx - (b[2] - b[0]) / 2 - b[0], y - b[1]), l, font=f_lead, fill=MUTED)
        y += p(38)
    y += g(40)

    # Las tres materias
    f_m = JM(p(23))
    f_md = JL(p(19))
    for nombre, desc in MATERIAS:
        tracked(d, cx, y, nombre, f_m, GOLD, p(3))
        y += p(32)
        b = d.textbbox((0, 0), desc, font=f_md)
        d.text((cx - (b[2] - b[0]) / 2 - b[0], y - b[1]), desc, font=f_md, fill=DIM)
        y += g(38)
    y += g(18)

    # Filete
    d.line([(cx - p(110), y), (cx + p(110), y)], fill=(205, 146, 58, 120), width=max(1, p(1)))
    y += g(46)

    # Precio y gancho
    f_pr = Q(p(60))
    precio = "$47"
    f_al = JL(p(24))
    w_pr = d.textlength(precio, font=f_pr)
    w_al = d.textlength(" / mes", font=f_al)
    x0 = cx - (w_pr + w_al) / 2
    b = d.textbbox((0, 0), precio, font=f_pr)
    d.text((x0 - b[0], y - b[1]), precio, font=f_pr, fill=WHITE)
    d.text((x0 + w_pr, y + p(26)), " / mes", font=f_al, fill=MUTED)
    y += g(80)

    f_g = JM(p(25))
    gancho = "Octubre gratis para los primeros 50"
    b = d.textbbox((0, 0), gancho, font=f_g)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], y - b[1]), gancho, font=f_g, fill=GOLD)
    y += g(50)

    f_s = JL(p(20))
    sub = "6 encuentros al mes, en vivo · queda grabado"
    b = d.textbbox((0, 0), sub, font=f_s)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], y - b[1]), sub, font=f_s, fill=DIM)

    # Pie: QR y dirección
    qsize = p(150)
    qi = qr(6).resize((qsize, qsize), Image.NEAREST)
    marco = Image.new("RGB", (qsize + p(16), qsize + p(16)), WHITE)
    marco.paste(qi, (p(8), p(8)))
    y_pie = H - pad_bot - marco.height - p(56)
    img.paste(marco, (cx - marco.width // 2, y_pie))

    f_url = JR(p(21))
    b = d.textbbox((0, 0), "holmanglobalgroup.com/ecos", font=f_url)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], y_pie + marco.height + p(24) - b[1]),
           "holmanglobalgroup.com/ecos", font=f_url, fill=WHITE)

    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA")
    lw = p(34)
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    img.paste(logo, (cx - logo.width // 2, H - pad_bot + p(4)), logo)

    nombre = {"45": "vertical-4x5", "11": "cuadrado-1x1", "916": "story-9x16"}[fmt]
    img.resize((W1, H1), Image.LANCZOS).save(OUT / f"ecos-club-{nombre}.png")
    img.save(OUT / f"ecos-club-{nombre}@2x.png")
    print(f"  ✓ ecos-club-{nombre}.png  ({W1}x{H1})")


if __name__ == "__main__":
    for f in ("45", "11", "916"):
        build(f)
