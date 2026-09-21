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


def marca(size):
    """La marca del club: una placa cuadrada con ECOS dentro.

    «BUSINESS CLUB» va FUERA, debajo. Metido dentro quedaba de borde a borde y
    la placa perdía el aire que la hace parecer una placa. Separados, la placa
    funciona sola como sello —en un avatar, en una marca de agua— y el
    descriptor la acompaña cuando hay sitio.
    """
    SS = 3
    D = size * SS
    img = Image.new("RGBA", (D, D), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(D * 0.185)

    d.rounded_rectangle([0, 0, D - 1, D - 1], radius=r, fill=(16, 23, 31, 255))
    # Dos filetes: uno marca el canto, otro lo separa por dentro. Es lo que hace
    # que se lea como placa grabada y no como un cuadro con borde.
    d.rounded_rectangle([0, 0, D - 1, D - 1], radius=r,
                        outline=(205, 146, 58, 205), width=int(2.6 * SS))
    m = int(D * 0.075)
    d.rounded_rectangle([m, m, D - 1 - m, D - 1 - m], radius=int(r * 0.72),
                        outline=(205, 146, 58, 62), width=max(1, int(1.1 * SS)))

    f = Q(int(D * 0.285))
    b = d.textbbox((0, 0), "ECOS", font=f)
    d.text((D / 2 - (b[2] - b[0]) / 2 - b[0], D / 2 - (b[3] - b[1]) / 2 - b[1]),
           "ECOS", font=f, fill=WHITE)
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

    # Marca: placa + descriptor debajo
    pl = marca(p(172))
    img.paste(pl, (cx - pl.width // 2, y), pl)
    y += pl.height + p(26)
    f_desc = JL(p(19))
    tracked(d, cx, y, "BUSINESS CLUB", f_desc, GOLD, p(7))
    y += g(60)

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


def logos():
    """La marca suelta, con fondo transparente.

    Sirve de avatar en redes, de marca de agua y para meterla en cualquier pieza
    sin tener que recortarla de un flyer.
    """
    LOGOS = OUT / "logo-ecos"
    LOGOS.mkdir(exist_ok=True)

    for px in (256, 512, 1024):
        marca(px).save(LOGOS / f"ecos-placa-{px}.png")

    # Lockup completo: placa y descriptor, como se ve en los flyers. El lienzo se
    # mide a partir del texto, que es más ancho que la placa.
    for px in (512, 1024):
        pl = marca(px)
        f = JL(int(px * 0.108))
        tmp = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
        tr = int(px * 0.040)
        w_txt = track_w(tmp, "BUSINESS CLUB", f, tr)
        W_ = int(max(px, w_txt) + px * 0.16)
        H_ = int(px * 1.30)
        img = Image.new("RGBA", (W_, H_), (0, 0, 0, 0))
        img.paste(pl, ((W_ - px) // 2, 0), pl)
        d = ImageDraw.Draw(img)
        tracked(d, W_ / 2, int(px * 1.10), "BUSINESS CLUB", f, GOLD, tr)
        img.save(LOGOS / f"ecos-lockup-{px}.png")

    # Versión para fondo claro: la placa se invierte.
    for px in (512,):
        SS = 3
        D = px * SS
        img = Image.new("RGBA", (D, D), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        r = int(D * 0.185)
        d.rounded_rectangle([0, 0, D - 1, D - 1], radius=r, fill=(11, 16, 22, 255))
        d.rounded_rectangle([0, 0, D - 1, D - 1], radius=r, outline=(205, 146, 58, 235), width=int(2.6 * SS))
        m = int(D * 0.075)
        d.rounded_rectangle([m, m, D - 1 - m, D - 1 - m], radius=int(r * 0.72),
                            outline=(205, 146, 58, 80), width=max(1, int(1.1 * SS)))
        f = Q(int(D * 0.285))
        b = d.textbbox((0, 0), "ECOS", font=f)
        d.text((D / 2 - (b[2] - b[0]) / 2 - b[0], D / 2 - (b[3] - b[1]) / 2 - b[1]),
               "ECOS", font=f, fill=WHITE)
        img.resize((px, px), Image.LANCZOS).save(LOGOS / f"ecos-placa-fondo-claro-{px}.png")

    print(f"  ✓ logos en flyers/logo-ecos/")


def og():
    """La imagen que se ve al compartir holmanglobalgroup.com/ecos.

    Es lo primero que la gente ve del club cuando llega el enlace por WhatsApp,
    antes de leer una sola palabra. 1200x630 es lo que piden WhatsApp, Facebook
    y X. Se arma a 2x y se reduce al final, para que el texto quede limpio.
    """
    W, H = 2400, 1260
    img = background(W, H)
    d = ImageDraw.Draw(img)

    MARGEN = 140
    placa_px = 440
    hueco = 150

    pl = marca(placa_px)
    f_desc = JL(42)
    tr_desc = 15
    alto_marca = placa_px + 46 + 42        # placa + aire + descriptor

    # Bloque de texto: se mide primero para poder centrar los dos como un grupo.
    f_h = Q(122)
    titulo = ["Ventas, marketing", "y oratoria."]
    f_s = JL(50)
    sub = "La misma habilidad: comunicar."
    f_p = Q(92)
    f_m = JL(42)
    f_x = JL(40)
    extra = "6 encuentros al mes, en vivo"

    alto_txt = len(titulo) * 146 + 42 + 60 + 52 + 46 + 104 + 62
    alto = max(alto_marca, alto_txt)
    top = (H - alto) // 2

    # Marca a la izquierda
    y_m = top + (alto - alto_marca) // 2
    img.paste(pl, (MARGEN, y_m), pl)
    tracked(d, MARGEN + placa_px / 2, y_m + placa_px + 46, "BUSINESS CLUB", f_desc, GOLD, tr_desc)

    # Texto a la derecha
    x = MARGEN + placa_px + hueco
    y = top + (alto - alto_txt) // 2
    for linea in titulo:
        b = d.textbbox((0, 0), linea, font=f_h)
        d.text((x - b[0], y - b[1]), linea, font=f_h, fill=WHITE)
        y += 146
    y += 42

    b = d.textbbox((0, 0), sub, font=f_s)
    d.text((x - b[0], y - b[1]), sub, font=f_s, fill=MUTED)
    y += 60 + 52

    d.line([(x, y), (x + 170, y)], fill=(205, 146, 58, 150), width=3)
    y += 46

    d.text((x, y), "$47", font=f_p, fill=WHITE)
    w = d.textlength("$47", font=f_p)
    d.text((x + w + 20, y + 42), "al mes · octubre gratis", font=f_m, fill=GOLD)
    b = d.textbbox((0, 0), extra, font=f_x)
    d.text((x - b[0], y + 104 + 34 - b[1]), extra, font=f_x, fill=DIM)

    img.resize((1200, 630), Image.LANCZOS).save(PROJ / "public/og-ecos.png")
    print("  ✓ public/og-ecos.png  (1200x630)")


if __name__ == "__main__":
    for f in ("45", "11", "916"):
        build(f)
    logos()
    og()
