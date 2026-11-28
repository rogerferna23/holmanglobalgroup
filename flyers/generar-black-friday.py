"""Flyers de Black Friday 2026 por producto de la tienda.

Estilo de la placa premium de ECOS Music: dos placas de metal unidas
(negro cepillado | oro cepillado). El flyer entero va mitad y mitad:
arriba tinta con la placa BLACK | FRIDAY, abajo oro con los precios.

  ./.venv/bin/python flyers/generar-black-friday.py sentido
Salida: flyers/black-friday/<producto>-story-9x16.png (1080x1920)
  ... --sol  -> flyers/black-friday/sol/ (foto de Sol y QR a holmanglobalgroup.com/marisol)
"""
import sys, pathlib
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

PROJ = pathlib.Path(__file__).resolve().parent.parent
OUT = PROJ / "flyers/black-friday"
F = str(pathlib.Path.home() / "Library/Fonts") + "/"
GOLD = (240, 184, 0)
INK = (14, 18, 24)
WHITE = (246, 244, 240)
W, H = 1080, 1920
CORTE = 1080  # donde termina la mitad oscura y empieza la dorada

# ---------------------------------------------------------------- productos
PRODUCTOS = {
    "sentido": {
        "kicker": "PROGRAMA",
        "nombre": "Sentido",
        "promesa": ["Claridad para cumplir", "tu primera meta en 90 días."],
        "niveles": [("Starter", "1 sesión de 60 min", "$67"),
                    ("Pro", "90 días · 8 sesiones 1 a 1", "$497"),
                    ("Elite", "6 meses · 16 sesiones 1 a 1", "$897")],
        "cupos": None,
        "cta": "Escribe «BLACK SENTIDO» por WhatsApp",
    },
    # Precios de la fase 1 (src/lib/marca-fases.ts): al llenarse 10 marcas, suben.
    "marca": {
        "kicker": "PROGRAMA DE 90 DÍAS",
        "nombre": "Marca con Huella",
        "promesa": ["Tu marca y tu producto,", "listos para vender."],
        "niveles": [("Starter", "Marca, landing y redes", "$1,097"),
                    ("Pro", "Con tu sitio web completo", "$1,497"),
                    ("Elite", "Con tu tienda en línea", "$2,197")],
        "cupos": "SOLO 10 MARCAS A ESTE PRECIO",
        "cta": "Escribe «BLACK MARCA» por WhatsApp",
    },
    "growth": {
        "kicker": "PARA TU MARCA",
        "nombre": "Growth System",
        "promesa": ["Todo para que tu marca venda cada mes:"],
        # Lo que incluye, en palabras simples (DelegaSales y DelegaWork van aquí, en paquete).
        "incluye": [["Redes sociales", "Página web", "Embudo a WhatsApp"],
                    ["Contenido con IA", "Campañas", "CRM"]],
        "niveles": [("Starter", "Redes, web y embudo a WhatsApp", "$297", "/mes"),
                    ("Pro", "+ Contenido y campañas con IA", "$497", "/mes"),
                    ("Elite", "+ CRM, anuncios y evento en vivo", "$997", "/mes")],
        "cupos": "SOLO 10 CUPOS",
        "cta": "Escribe «BLACK GROWTH» por WhatsApp",
    },
    "anual": {
        "kicker": "12 MESES CON HGG",
        "nombre": "Acompañamiento anual",
        "promesa": ["Todo nuestro equipo,", "para tu proyecto."],
        "niveles": [("Mensual", "12 pagos · sin comisión", "$1,497", "/mes"),
                    ("De contado", "Un solo pago · sin comisión", "$14,997")],
        "cupos": "SOLO 5 CUPOS",
        "cta": "Escribe «BLACK ANUAL» por WhatsApp",
    },
    "llc": {
        "kicker": "TU EMPRESA EN EE. UU.",
        "nombre": "Tu LLC",
        "promesa": ["Creamos tu empresa", "y sacamos tu EIN."],
        "niveles": [("Creación + EIN", "Registro, agente registrado y EIN", "$597"),
                    ("Declaración anual", "Tu declaración ante el IRS", "$347", "/año"),
                    ("Mantenimiento anual", "Agente registrado e informe anual", "$397", "/año")],
        "cupos": None,
        "cta": "Escribe «BLACK LLC» por WhatsApp",
    },
    # ECOS: el regalo es la prueba de 14 días (sin tarjeta). El QR va a /ecos.
    "ecos": {
        "kicker": "BUSINESS CLUB",
        "nombre": "ECOS",
        "promesa": ["Habla de tu negocio con seguridad", "y conviértelo en ventas."],
        "niveles": [("14 días", "De regalo, sin tarjeta", "GRATIS"),
                    ("Clases en vivo", "Ventas, oratoria y marketing", ""),
                    ("Después", "Sin permanencia, cancelas cuando quieras", "$47", "/mes")],
        "cupos": "14 DÍAS DE REGALO",
        "qr": ("qr-ecos.png", "Empieza tus 14 días gratis", "holmanglobalgroup.com/ecos"),
    },
}
HASTA = "Solo hasta el lunes 30 de noviembre"


def font(n, s):
    return ImageFont.truetype(F + n, int(s))


def track_w(t, f, sp):
    return sum(f.getlength(c) for c in t) + sp * (len(t) - 1)


def track(d, cx, y, t, f, fill, sp):
    x = cx - track_w(t, f, sp) / 2
    for c in t:
        d.text((x, y), c, font=f, fill=fill)
        x += f.getlength(c) + sp


def center(d, y, t, f, fill):
    d.text((W / 2 - f.getlength(t) / 2, y), t, font=f, fill=fill)


def _grad(h, w, stops, axis=0):
    n = h if axis == 0 else w
    p = np.linspace(0, 1, n)
    line = np.stack([np.interp(p, [s[0] for s in stops], [s[1][c] for s in stops]) for c in range(3)], -1)
    a = np.repeat(line[:, None, :], w, 1) if axis == 0 else np.repeat(line[None, :, :], h, 0)
    return a.astype(np.float32)


def _mask(w, h, box, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle(box, r, fill=255)
    return m


def cepillado(h, w, stops, amp, seed, sheen_x=0.7, sheen_k=30):
    r = np.random.default_rng(seed)
    a = _grad(h, w, stops, 0)
    vetas = cv2.resize(r.normal(0, 1, (h, max(8, w // 40))).astype(np.float32), (w, h))
    vetas = cv2.GaussianBlur(vetas, (0, 0), sigmaX=w * 0.01, sigmaY=0.6)
    vetas /= np.abs(vetas).max() + 1e-6
    fino = cv2.GaussianBlur(r.normal(0, 1, (h, w)).astype(np.float32), (0, 0), sigmaX=40, sigmaY=0.5)
    fino /= np.abs(fino).max() + 1e-6
    a = a + (vetas * amp + fino * amp * 0.6)[..., None]
    xx = np.arange(w)[None, :].astype(np.float32)
    yy = np.arange(h)[:, None].astype(np.float32)
    sh = np.exp(-(((xx - yy * 1.2) - w * sheen_x) ** 2) / (2 * (w * 0.12) ** 2)) * sheen_k
    return np.clip(a + sh[..., None], 0, 255)


NEGRO = [(0, (58, 63, 74)), (0.5, (30, 34, 42)), (1, (14, 16, 21))]
ORO = [(0, (255, 220, 96)), (0.45, (240, 184, 10)), (1, (196, 136, 0))]
ORO_FILO = [(0, (150, 122, 66)), (0.25, (226, 204, 150)), (0.5, (178, 146, 82)),
            (0.75, (220, 196, 140)), (1, (140, 114, 62))]


def placa(Wp, izq="BLACK", der="FRIDAY"):
    """La placa de ECOS Music con otras palabras: negro cepillado | oro cepillado."""
    S = 2
    Hp = int(Wp * 0.27)
    w, h = Wp * S, Hp * S
    r, fr = h * 0.11, max(2, int(h * 0.0065))
    marco = _grad(h, w, ORO_FILO, 0) * 0.6 + _grad(h, w, ORO_FILO, 1)[:, ::-1] * 0.4
    split = int(w * 0.46)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    im.paste(Image.fromarray(marco.astype(np.uint8)), (0, 0), _mask(w, h, [0, 0, w - 1, h - 1], r))
    face = np.where(np.arange(w)[None, :, None] < split,
                    cepillado(h, w, NEGRO, 7, 3, 0.25, 22), cepillado(h, w, ORO, 12, 5, 0.85, 34)).astype(np.uint8)
    inner = _mask(w, h, [fr, fr, w - fr, h - fr], r - fr)
    im.paste(Image.fromarray(face), (0, 0), inner)
    bev = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    b = ImageDraw.Draw(bev)
    t = max(2, int(h * 0.010))
    for x0, x1 in ((fr, split - t), (split + t, w - fr)):
        b.rectangle([x0, fr, x1, fr + t], fill=(255, 255, 255, 70))
        b.rectangle([x0, h - fr - t, x1, h - fr], fill=(0, 0, 0, 90))
    b.rectangle([split - t, fr, split + t, h - fr], fill=(8, 9, 12, 230))
    b.rectangle([split + t, fr, split + t + max(1, t // 2), h - fr], fill=(255, 236, 170, 120))
    a = np.minimum(np.asarray(bev)[..., 3], np.asarray(inner))
    bev = Image.fromarray(np.dstack([np.asarray(bev)[..., :3], a]).astype(np.uint8))
    im.alpha_composite(bev.filter(ImageFilter.GaussianBlur(t * 0.4)))

    q = font("Questrial-Regular.ttf", h * 0.40)
    # que las dos palabras quepan con aire en su placa
    while q.getlength(der) > (w - split) * 0.80 or q.getlength(izq) > split * 0.80:
        q = font("Questrial-Regular.ttf", q.size * 0.96)
    l, tt, rr, bb = q.getbbox("BF")
    y = h / 2 - (bb + tt) / 2
    x1 = split / 2 - q.getlength(izq) / 2
    x2 = split + (w - split) / 2 - q.getlength(der) / 2
    sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((x1, y + h * 0.012), izq, font=q, fill=(0, 0, 0, 210))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(h * 0.012)))
    d = ImageDraw.Draw(im)
    d.text((x2, y + h * 0.007), der, font=q, fill=(255, 238, 170, 190))
    d.text((x1, y), izq, font=q, fill=(250, 250, 248, 255))
    d.text((x2, y), der, font=q, fill=(22, 22, 26, 255))
    return im.resize((Wp, Hp), Image.LANCZOS)


def fondo():
    """Arriba tinta con halo dorado suave; abajo oro cepillado. Filo de luz en el corte."""
    top = _grad(CORTE, W, [(0, (22, 26, 33)), (1, (10, 13, 18))], 0)
    yy, xx = np.mgrid[0:CORTE, 0:W].astype(np.float32)
    top += (np.exp(-(((xx - W / 2) / (W * 0.55)) ** 2 + ((yy - CORTE * 0.42) / (CORTE * 0.38)) ** 2)) * 14)[..., None] \
        * np.array([1.0, 0.85, 0.4], np.float32)
    bot = cepillado(H - CORTE, W, [(0, (250, 206, 70)), (0.5, (236, 178, 8)), (1, (200, 140, 0))], 10, 9, 0.75, 28)
    im = Image.fromarray(np.clip(np.vstack([top, bot]), 0, 255).astype(np.uint8)).convert("RGBA")
    d = ImageDraw.Draw(im)
    d.rectangle([0, CORTE - 3, W, CORTE], fill=(8, 9, 12, 255))          # ranura
    d.rectangle([0, CORTE + 1, W, CORTE + 2], fill=(255, 236, 170, 255))  # canto de luz
    return im


def foto_circulo(d_px):
    """Retrato de Sol (el de su landing) en círculo con aro dorado."""
    src = Image.open(PROJ / "public/marisol/retrato.webp").convert("RGB").crop((130, 110, 710, 690))
    S = 3
    src = src.resize((d_px * S, d_px * S), Image.LANCZOS)
    m = Image.new("L", src.size, 0)
    ImageDraw.Draw(m).ellipse([0, 0, d_px * S - 1, d_px * S - 1], fill=255)
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    out.paste(src, (0, 0), m)
    ImageDraw.Draw(out).ellipse([2, 2, d_px * S - 3, d_px * S - 3], outline=GOLD + (255,), width=4 * S)
    return out.resize((d_px, d_px), Image.LANCZOS)


SOL_URL = "holmanglobalgroup.com/marisol"


def build(clave, sol=False):
    p = PRODUCTOS[clave]
    im = fondo()
    d = ImageDraw.Draw(im)

    # ---- mitad oscura
    track(d, W / 2, 90 if sol else 120, "HOLMAN GLOBAL GROUP", font("JosefinSans-Regular.ttf", 26), GOLD, 9)
    pl = placa(760 if sol else 900)
    x, y = (W - pl.width) // 2, 150 if sol else 230
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sh.paste(Image.new("RGBA", pl.size, (0, 0, 0, 220)), (x, y + 22), pl.split()[3])
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    im.alpha_composite(pl, (x, y))
    d = ImageDraw.Draw(im)

    up = (90 if p.get("incluye") else 45) if p["cupos"] else 0
    if sol:
        # en lugar del kicker: Sol, con su foto, nombre y cargo
        ft = foto_circulo(150)
        fn1 = font("Questrial-Regular.ttf", 50)
        fn2 = font("JosefinSans-Regular.ttf", 28)
        tw = max(fn1.getlength("Sol Alarcón"), track_w("DIRECTORA COMERCIAL", fn2, 5))
        x0 = (W - (150 + 34 + tw)) / 2
        im.alpha_composite(ft, (int(x0), 400))
        d = ImageDraw.Draw(im)
        d.text((x0 + 184, 422), "Sol Alarcón", font=fn1, fill=WHITE)
        xx = x0 + 184
        for c in "DIRECTORA COMERCIAL":
            d.text((xx, 494), c, font=fn2, fill=GOLD)
            xx += fn2.getlength(c) + 5
    else:
        track(d, W / 2, 600 - up, p["kicker"], font("JosefinSans-Regular.ttf", 34), GOLD, 14)
    fq = font("Questrial-Regular.ttf", 130 if p.get("incluye") else 150)
    while fq.getlength(p["nombre"]) > W - 150:
        fq = font("Questrial-Regular.ttf", fq.size - 2)
    _, t, _, b = fq.getbbox("Sd")
    center(d, 735 - up - (t + b) / 2, p["nombre"], fq, WHITE)
    if p.get("incluye"):
        center(d, 768, p["promesa"][0], font("JosefinSans-Light.ttf", 38), (220, 222, 226))
        fch = font("JosefinSans-Regular.ttf", 29)
        for r, fila in enumerate(p["incluye"]):
            ws = [fch.getlength(t) + 52 for t in fila]
            x = (W - sum(ws) - 14 * (len(fila) - 1)) / 2
            yc = 826 + r * 68
            for t, w_ in zip(fila, ws):
                d.rounded_rectangle([x, yc, x + w_, yc + 54], 27, fill=(30, 34, 42), outline=(120, 100, 50), width=2)
                d.text((x + 26, yc + 13), t, font=fch, fill=WHITE)
                x += w_ + 14
    else:
        fp = font("JosefinSans-Light.ttf", 44)
        for i, line in enumerate(p["promesa"]):
            center(d, 860 - up + i * 62, line, fp, (220, 222, 226))
    if p["cupos"]:
        fc = font("JosefinSans-SemiBold.ttf", 28)
        pw = track_w(p["cupos"], fc, 6) + 80
        d.rounded_rectangle([(W - pw) / 2, 975, (W + pw) / 2, 1035], 30, outline=GOLD, width=2)
        track(d, W / 2, 993, p["cupos"], fc, GOLD, 6)

    # ---- mitad dorada
    tinta = INK
    gris = (60, 48, 14)
    y0 = CORTE + 70
    fn = font("Questrial-Regular.ttf", 54)
    fd = font("JosefinSans-Regular.ttf", 32)
    fprecio = font("Questrial-Regular.ttf", 66)
    fsuf = font("JosefinSans-Regular.ttf", 32)
    n = len(p["niveles"])
    rs = 140 if n <= 3 else 118
    y0 += (3 - n) * 70 if n <= 3 else -40
    for i, (nivel, detalle, precio, *suf) in enumerate(p["niveles"]):
        yy = y0 + i * rs
        d.text((110, yy), nivel, font=fn, fill=tinta)
        d.text((112, yy + (70 if n <= 3 else 60)), detalle, font=fd, fill=gris)
        sw = fsuf.getlength(suf[0]) + 6 if suf else 0
        xp = W - 110 - sw - fprecio.getlength(precio)
        d.text((xp, yy + 6), precio, font=fprecio, fill=tinta)
        if suf:
            d.text((W - 110 - sw + 6, yy + 42), suf[0], font=fsuf, fill=gris)
        if i < len(p["niveles"]) - 1:
            d.line([110, yy + rs - (20 if n <= 3 else 12), W - 110, yy + rs - (20 if n <= 3 else 12)], fill=(120, 90, 10), width=2)

    yb = CORTE + 70 + 3 * 140 + 10
    tarjeta = p.get("qr")
    if sol:
        # Sol: a su landing; en el club, a /ecos con su código de embajadora (ECOS36, el de /marisol)
        tarjeta = (("qr-ecos-sol.png", "Empieza tus 14 días con Sol", "holmanglobalgroup.com/ecos?ref=ECOS36")
                   if clave == "ecos" else ("qr-sol.png", "Aparta tu lugar con Sol", SOL_URL))
    if tarjeta:
        # tarjeta tinta: invitación + QR a la página
        qr_file, titulo, url = tarjeta
        d.rounded_rectangle([90, yb - 10, W - 90, yb + 220], 34, fill=INK)
        qr = Image.open(OUT / qr_file).convert("RGBA").resize((190, 190), Image.NEAREST)
        im.alpha_composite(qr, (W - 90 - 20 - 190, yb + 10))
        d = ImageDraw.Draw(im)
        d.text((130, yb + 30), titulo, font=font("JosefinSans-SemiBold.ttf", 38), fill=GOLD)
        d.text((130, yb + 95), "Escanea el código o entra a", font=font("JosefinSans-Light.ttf", 30), fill=(220, 222, 226))
        d.text((130, yb + 140), url, font=font("Questrial-Regular.ttf", 31), fill=WHITE)
        track(d, W / 2, yb + 255, HASTA.upper(), font("JosefinSans-SemiBold.ttf", 26), tinta, 4)
    else:
        # cinta tinta con el CTA
        d.rounded_rectangle([90, yb, W - 90, yb + 120], 60, fill=INK)
        fc = font("JosefinSans-SemiBold.ttf", 36)
        center(d, yb + 40, p["cta"], fc, GOLD)
        track(d, W / 2, yb + 150, HASTA.upper(), font("JosefinSans-SemiBold.ttf", 26), tinta, 4)

    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((70, 70), Image.LANCZOS)
    # el logo es dorado: sobre oro se pierde, así que va en tinta
    a = logo.split()[3]
    logo_ink = Image.new("RGBA", logo.size, INK + (255,))
    logo_ink.putalpha(a)
    if not tarjeta:
        im.alpha_composite(logo_ink, ((W - 70) // 2, H - 105))

    carpeta = OUT / "sol" if sol else OUT
    carpeta.mkdir(parents=True, exist_ok=True)
    out = carpeta / f"{clave}-story-9x16.png"
    im.convert("RGB").save(out, optimize=True)
    print(out)


if __name__ == "__main__":
    sol = "--sol" in sys.argv  # versión de Sol: su foto y QR a su landing
    for c in [a for a in sys.argv[1:] if a != "--sol"] or PRODUCTOS:
        build(c, sol)
