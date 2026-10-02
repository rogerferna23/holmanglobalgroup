# -*- coding: utf-8 -*-
"""Publicidad de ECOS Business Club — carrusel y cuenta regresiva.

Mismo sistema que los flyers (generar-flyer-ecos.py): fondo #0B1016, dorado
#F0B800, Questrial para titulares y Josefin Sans para el resto. Estas piezas
anuncian el club y no muestran el precio: el precio vive en la página.

    ./.venv/bin/python flyers/generar-publicidad-ecos.py              # todo
    ./.venv/bin/python flyers/generar-publicidad-ecos.py --quedan 12  # story «Quedan 12 lugares»

Salida en flyers/publicidad-ecos/.
"""
import argparse
import importlib.util
import pathlib

import numpy as np
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("flyer_ecos", HERE / "generar-flyer-ecos.py")
fe = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fe)

S = 2
BG, GOLD, WHITE, MUTED, DIM = fe.BG, fe.GOLD, fe.WHITE, fe.MUTED, fe.DIM
Q, JL, JR, JM = fe.Q, fe.JL, fe.JR, fe.JM
LINE = (255, 255, 255, 22)
OUT = HERE / "publicidad-ecos"

# ── Lo que se toca más seguido ──────────────────────────────────────────────
APERTURA = "1 de octubre"
CUPO = 20
GANCHO = "Octubre de regalo"
URL_TXT = "holmanglobalgroup.com/ecos"
DIAS = [7, 5, 3, 2, 1, 0]  # 0 = «Hoy abrimos»


def p(v):
    return int(round(v * S))


def fondo(w, h, halos):
    """Fondo oscuro con halos dorados y grano. halos: (cx, cy, rx, ry, fuerza)."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h
    glow = np.zeros((h, w), np.float32)
    for cx, cy, rx, ry, k in halos:
        d = np.sqrt(((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2)
        glow += np.clip(1.0 - d, 0.0, 1.0) ** 1.6 * k
    glow = np.clip(glow, 0, 1)[..., None]
    arr = np.array(BG, np.float32) * (1 - glow) + np.array(GOLD, np.float32) * glow
    rng = np.random.default_rng(7)
    arr = np.clip(arr + rng.normal(0, 9, (h, w, 1)).astype(np.float32), 0, 255)
    return Image.fromarray(arr.astype(np.uint8)).convert("RGBA")


def wrap(d, text, font, maxw):
    lineas, linea = [], ""
    for w in text.split():
        t = (linea + " " + w).strip()
        if d.textlength(t, font=font) > maxw and linea:
            lineas.append(linea)
            linea = w
        else:
            linea = t
    lineas.append(linea)
    return lineas


def bloque(d, x, y, text, font, fill, maxw, lh, centro=False):
    """Párrafo con salto de línea («\n» fuerza el corte). Devuelve la y siguiente."""
    for l in [l for par in text.split("\n") for l in wrap(d, par, font, maxw)]:
        b = d.textbbox((0, 0), l, font=font)
        xx = x - (b[2] - b[0]) / 2 - b[0] if centro else x - b[0]
        d.text((xx, y - b[1]), l, font=font, fill=fill)
        y += lh
    return y


def tracked_left(d, x, y, text, font, fill, tracking):
    for c in text:
        d.text((x, y), c, font=font, fill=fill)
        x += d.textlength(c, font=font) + tracking


def centrado(d, cx, y, text, font, fill):
    b = d.textbbox((0, 0), text, font=font)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], y - b[1]), text, font=font, fill=fill)


def pegar_centro(img, pieza, cx, y):
    img.alpha_composite(pieza, (int(cx - pieza.width / 2), int(y)))


def guardar(img, carpeta, nombre, w1, h1):
    carpeta.mkdir(parents=True, exist_ok=True)
    img = img.convert("RGB")
    img.resize((w1, h1), Image.LANCZOS).save(carpeta / f"{nombre}.png")
    img.save(carpeta / f"{nombre}@{S}x.png")
    print(f"  ✓ {carpeta.name}/{nombre}.png")


def qr_marco(lado):
    qi = fe.qr(6).resize((p(lado), p(lado)), Image.NEAREST)
    m = Image.new("RGBA", (p(lado + 16), p(lado + 16)), WHITE + (255,))
    m.paste(qi, (p(8), p(8)))
    return m


# ── Carrusel 4x5 ────────────────────────────────────────────────────────────
W1, H1 = 1080, 1350
M = 96
TOTAL = 7


def lamina(n, eyebrow=None):
    """Lienzo común: cabecera, barra de avance y «Desliza»."""
    W, H = p(W1), p(H1)
    # El halo cambia de lado lámina a lámina: al deslizar, la luz viaja.
    cx = [0.5, 0.15, 0.85, 0.2, 0.8, 0.25, 0.5][n - 1]
    img = fondo(W, H, [(cx, -0.08, 0.75, 0.42, 0.20), (1 - cx, 1.08, 0.6, 0.3, 0.10)])
    d = ImageDraw.Draw(img)

    f_h = JL(p(17))
    tracked_left(d, p(M), p(84), "ECOS · BUSINESS CLUB", f_h, GOLD, p(5))
    num = f"{n:02d} / {TOTAL:02d}"
    d.text((W - p(M) - d.textlength(num, font=f_h), p(84)), num, font=f_h, fill=DIM)

    # Barra de avance: un tramo por lámina, el actual en dorado.
    y_bar = H - p(104)
    ancho = W - p(M) * 2
    gap = p(10)
    seg = (ancho - gap * (TOTAL - 1)) / TOTAL
    for i in range(TOTAL):
        x0 = p(M) + i * (seg + gap)
        d.rectangle([x0, y_bar, x0 + seg, y_bar + p(3)], fill=GOLD if i == n - 1 else LINE)
    if n < TOTAL:
        # La flecha se dibuja: Josefin Sans no trae el glifo «→».
        f = JR(p(20))
        xa, ya = W - p(M), y_bar + p(40)
        d.line([(xa - p(34), ya), (xa, ya)], fill=MUTED, width=p(2))
        d.line([(xa - p(10), ya - p(8)), (xa, ya), (xa - p(10), ya + p(8))], fill=MUTED, width=p(2))
        d.text((xa - p(48) - d.textlength("Desliza", font=f), y_bar + p(28)), "Desliza", font=f, fill=MUTED)

    # El contenido va en su propia capa: al final se mide y se centra en alto,
    # para que ninguna lámina quede con el texto arriba y un vacío abajo.
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dc = ImageDraw.Draw(capa)
    if eyebrow:
        tracked_left(dc, p(M), p(250), eyebrow, JM(p(22)), GOLD, p(5))
    return img, dc, capa


def componer(img, capa):
    """Centra en alto la capa de contenido entre la cabecera y la barra."""
    bb = capa.getbbox()
    top, bot = p(150), img.height - p(150)
    dy = int((top + bot) / 2 - (bb[1] + bb[3]) / 2)
    img.alpha_composite(capa, (0, dy))
    return img


def titulo(d, text, y=300, size=72, lh=84):
    return bloque(d, p(M), p(y), text, Q(p(size)), WHITE, p(W1 - M * 2), p(lh))


def filas(d, y, items, col=210):
    """Filas etiqueta · texto separadas por filetes finos."""
    x_txt = p(M + col)
    maxw = p(W1 - M) - x_txt
    for etq, txt in items:
        d.line([(p(M), y), (p(W1 - M), y)], fill=LINE, width=p(1))
        y += p(34)
        tracked_left(d, p(M), y + p(6), etq, JM(p(22)), GOLD, p(3))
        y = bloque(d, x_txt, y, txt, JL(p(33)), WHITE, maxw, p(45))
        y += p(34)
    d.line([(p(M), y), (p(W1 - M), y)], fill=LINE, width=p(1))
    return y


def carrusel():
    car = OUT / "carrusel"
    W = p(W1)

    # 1 · Portada
    img, d, capa = lamina(1)
    cx = W / 2
    pegar_centro(capa, fe.marca(p(250)).convert("RGBA"), cx, p(250))
    fe.tracked(d, cx, p(534), "BUSINESS CLUB", JL(p(21)), GOLD, p(8))
    y = bloque(d, cx, p(650), "Las habilidades que tu negocio necesita.", Q(p(72)),
               WHITE, p(820), p(86), centro=True)
    bloque(d, cx, y + p(34), "Ventas, marketing y oratoria. Una sola habilidad: comunicar.",
           JL(p(33)), MUTED, p(780), p(46), centro=True)
    guardar(componer(img, capa), car, "01-portada", W1, H1)

    # 2 · Para quién es
    img, d, capa = lamina(2, "PARA TI")
    y = titulo(d, "Tienes algo\nvalioso que dar.", size=76, lh=88)
    y = bloque(d, p(M), y + p(36),
               "Y quieres que se entienda, que se venda y que se escuche.",
               JL(p(36)), MUTED, p(W1 - M * 2 - 60), p(50))
    y += p(70)
    d.line([(p(M), y), (p(M + 120), y)], fill=GOLD, width=p(2))
    bloque(d, p(M), y + p(56),
           "ECOS es el club donde entrenas eso cada semana, con gente que va por lo mismo.",
           Q(p(40)), WHITE, p(W1 - M * 2 - 40), p(54))
    guardar(componer(img, capa), car, "02-para-ti", W1, H1)

    # 3 · Tres materias
    img, d, capa = lamina(3, "TRES MATERIAS")
    y = titulo(d, "Una sola habilidad: comunicar.")
    filas(d, y + p(60), [
        ("VENTAS", "Para que alguien decida. La conversación que llega al sí."),
        ("MARKETING", "Para que te encuentren. Un mensaje claro que atrae a las personas correctas."),
        ("ORATORIA", "Para que te crean. Voz, presencia y un discurso que se recuerda."),
    ])
    guardar(componer(img, capa), car, "03-materias", W1, H1)

    # 4 · Cómo es un mes
    img, d, capa = lamina(4, "CÓMO ES UN MES")
    y = titulo(d, "Poca teoría.\nMucha práctica.")
    filas(d, y + p(56), [
        ("VENTAS", "15 minutos de teoría y el resto practicas frente a la sala."),
        ("ORATORIA", "Igual: teoría corta y práctica con devolución en el momento."),
        ("MARKETING", "Clase en vivo con espacio abierto para tus preguntas."),
        ("CADA MES", "Masterclass abierta, con un tema a fondo."),
    ])
    guardar(componer(img, capa), car, "04-como-es-un-mes", W1, H1)

    # 5 · Lo que vas a lograr
    img, d, capa = lamina(5, "LO QUE VAS A LOGRAR")
    y = titulo(d, "Resultados que se\nnotan en tu negocio.")
    y += p(64)
    for txt in [
        "Guías la conversación hasta el sí y cierras con seguridad.",
        "Tu mensaje es claro y atrae a las personas correctas.",
        "Tienes un discurso de cinco minutos listo para un escenario o un live.",
    ]:
        d.ellipse([p(M), y + p(12), p(M + 14), y + p(26)], fill=GOLD)
        y = bloque(d, p(M + 48), y, txt, JL(p(38)), WHITE, p(W1 - M * 2 - 48), p(52))
        y += p(40)
    guardar(componer(img, capa), car, "05-lo-que-vas-a-lograr", W1, H1)

    # 6 · Además
    img, d, capa = lamina(6, "Y ADEMÁS")
    y = titulo(d, "Una comunidad que sabe qué haces y te recomienda.")
    filas(d, y + p(56), [
        ("AVANCE", "Niveles por habilidad, racha semanal, retos e insignias."),
        ("EMBAJADOR", "Ganas por cada persona que entra al club con tu enlace."),
        ("LIBERTAD", "Sin permanencia. Cancelas desde tu cuenta cuando quieras."),
    ], col=240)
    guardar(componer(img, capa), car, "06-y-ademas", W1, H1)

    # 7 · Llamado
    img, d, capa = lamina(7)
    cx = W / 2
    fe.tracked(d, cx, p(236), f"ABRIMOS EL {APERTURA.upper()}", JM(p(22)), GOLD, p(6))
    y = bloque(d, cx, p(300), f"{CUPO} lugares fundadores.", Q(p(80)), WHITE, p(880), p(92), centro=True)
    centrado(d, cx, y + p(20), f"{GANCHO} para quienes entren primero.", JM(p(32)), GOLD)
    q = qr_marco(210)
    pegar_centro(capa, q, cx, p(620))
    centrado(d, cx, p(620) + q.height + p(44), "Aparta tu lugar en", JL(p(26)), MUTED)
    centrado(d, cx, p(620) + q.height + p(86), URL_TXT, JR(p(32)), WHITE)
    guardar(componer(img, capa), car, "07-aparta-tu-lugar", W1, H1)


# ── Stories 9x16 ────────────────────────────────────────────────────────────
SW, SH = 1080, 1920
# Instagram tapa ~250 px arriba y ~300 abajo con su interfaz: ahí no va nada vital.


def story(eyebrow, numero, remate, frase, nombre, cierre=True):
    """cierre=False deja solo la dirección: en «Quedan N» el gancho ya es la frase."""
    W, H = p(SW), p(SH)
    img = fondo(W, H, [(0.5, 0.47, 0.85, 0.36, 0.20), (0.5, -0.05, 0.7, 0.25, 0.10)])
    d = ImageDraw.Draw(img)
    cx = W / 2

    pegar_centro(img, fe.marca(p(150)).convert("RGBA"), cx, p(270))
    fe.tracked(d, cx, p(452), "BUSINESS CLUB", JL(p(19)), GOLD, p(7))

    fe.tracked(d, cx, p(640), eyebrow, JM(p(28)), MUTED, p(10))
    f_n = Q(p(360 if len(numero) <= 2 else 250))
    centrado(d, cx, p(710) + (p(40) if len(numero) > 2 else 0), numero, f_n, WHITE)
    fe.tracked(d, cx, p(1100), remate, JM(p(30)), GOLD, p(10))

    y = bloque(d, cx, p(1210), frase, Q(p(50)), WHITE, p(840), p(64), centro=True)
    fe.tracked(d, cx, y + p(30), "VENTAS · MARKETING · ORATORIA", JL(p(20)), MUTED, p(5))

    if cierre:
        centrado(d, cx, p(1500), f"{CUPO} lugares fundadores · {GANCHO.lower()}", JM(p(30)), GOLD)
    centrado(d, cx, p(1556), URL_TXT, JR(p(28)), WHITE)
    guardar(img, OUT / "cuenta-regresiva", nombre, SW, SH)


def cuenta_regresiva():
    for n in DIAS:
        if n == 0:
            story("ECOS ABRE", "HOY", "LAS PUERTAS", "Los primeros en entrar son los fundadores.",
                  "00-hoy-abrimos")
        else:
            story("FALTA" if n == 1 else "FALTAN", str(n), "DÍA" if n == 1 else "DÍAS",
                  f"ECOS abre el {APERTURA}.", "01-falta-1-dia" if n == 1 else f"{n:02d}-faltan-{n}-dias")


def quedan(n):
    story("QUEDAN" if n != 1 else "QUEDA", str(n), "LUGARES FUNDADORES" if n != 1 else "LUGAR FUNDADOR",
          f"{GANCHO} para quienes entren primero.", f"quedan-{n}-lugares", cierre=False)


# ── Flyer de siempre (1080×1350) ────────────────────────────────────────────
# Presenta el club en una frase. Sin fecha, sin precio y sin cupo: sirve hoy y
# dentro de un año.


def ecos_placa(w, h, cx, cy, lado, n=3, paso=30):
    """El «eco» del nombre: contornos con la misma forma de la placa, que se
    abren a su alrededor y se apagan. Siguen el cuadrado para que la marca y
    su eco se lean como una sola figura."""
    SS = 3
    capa = Image.new("RGBA", (w * SS // S, h * SS // S), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    k = SS / S
    for i in range(1, n + 1):
        m = paso * i
        l = lado + 2 * m
        r = l * 0.185 + m * 0.35
        a = [70, 36, 16][i - 1]
        d.rounded_rectangle([(cx - l / 2) * k, (cy - l / 2) * k, (cx + l / 2) * k, (cy + l / 2) * k],
                            radius=r * k, outline=(205, 146, 58, a), width=max(1, int(p(1.2) * k)))
    return capa.resize((w, h), Image.LANCZOS)


# Medidas de cada formato del flyer. El 9x16 deja libres ~250 px arriba y ~300
# abajo, que es lo que tapa la interfaz de las historias.
FLYER = {
    "4x5":  dict(H=1350, placa=180, paso=22, y_pl=130, y_h=500, h=68, lh=82, lead=31,
                 lead_lh=44, pil=22, qr=150, pie=118, y_logo=66, cta=46, url=27),
    "9x16": dict(H=1920, placa=210, paso=26, y_pl=300, y_h=760, h=70, lh=86, lead=32,
                 lead_lh=46, pil=23, qr=160, pie=370, y_logo=290, cta=48, url=28),
    "1x1":  dict(H=1080, placa=140, paso=15, y_pl=84, y_h=362, h=56, lh=68, lead=27,
                 lead_lh=38, pil=20, qr=124, pie=96, y_logo=48, cta=40, url=24),
}


def flyer(fmt="4x5"):
    L = FLYER[fmt]
    W, H = p(1080), p(L["H"])
    img = fondo(W, H, [(0.5, 0.10, 0.9, 0.40, 0.20), (0.5, 1.1, 0.7, 0.3, 0.08)])
    cx = W / 2

    placa, paso = p(L["placa"]), p(L["paso"])
    y_pl = p(L["y_pl"])
    img.alpha_composite(ecos_placa(W, H, cx, y_pl + placa / 2, placa, 3, paso))
    pegar_centro(img, fe.marca(placa).convert("RGBA"), cx, y_pl)
    d = ImageDraw.Draw(img)
    y = y_pl + placa + 3 * paso + p(22)
    fe.tracked(d, cx, y, "BUSINESS CLUB", JL(p(22 * L["placa"] / 180)), GOLD, p(9 * L["placa"] / 180))

    y = p(L["y_h"])
    f_h = Q(p(L["h"]))
    for linea, color in [("Aprende las habilidades", WHITE),
                         ("que tu negocio necesita,", WHITE),
                         ("con la comunidad correcta.", GOLD)]:
        centrado(d, cx, y, linea, f_h, color)
        y += p(L["lh"])
    y += p(L["lh"] * 0.41)

    y = bloque(d, cx, y,
               "Un club en vivo donde aprendes a vender, a comunicar tu marca "
               "y a hablar en público.",
               JL(p(L["lead"])), MUTED, p(760), p(L["lead_lh"]), centro=True)
    y += p(L["lead_lh"] * 1.1)

    fe.tracked(d, cx, y, "VENTAS  ·  MARKETING  ·  ORATORIA", JM(p(L["pil"])), WHITE, p(5))

    # Pie: QR + llamado, como un solo grupo centrado
    q = qr_marco(L["qr"])
    f_c = Q(p(L["cta"]))
    f_u = JR(p(L["url"]))
    w_txt = max(d.textlength("Únete a ECOS", font=f_c), d.textlength(URL_TXT, font=f_u))
    gap = p(40)
    x0 = int(cx - (q.width + gap + w_txt) / 2)
    y_q = H - p(L["pie"]) - q.height
    img.alpha_composite(q, (x0, y_q))
    xt = x0 + q.width + gap
    k = L["qr"] / 150
    d.text((xt, y_q + p(30 * k)), "Únete a ECOS", font=f_c, fill=WHITE)
    d.text((xt, y_q + p(100 * k)), URL_TXT, font=f_u, fill=GOLD)

    logo = Image.open(HERE.parent / "public/logo-h.png").convert("RGBA")
    lw = p(30)
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    f_f = JL(p(18))
    t = "UN CLUB DE HOLMAN GLOBAL GROUP"
    tw = fe.track_w(d, t, f_f, p(4))
    xl = int(cx - (lw + p(14) + tw) / 2)
    yl = H - p(L["y_logo"])
    img.alpha_composite(logo, (xl, yl - logo.height // 2))
    tracked_left(d, xl + lw + p(14), yl - p(9), t, f_f, DIM, p(4))

    guardar(img, OUT / "flyer", f"ecos-business-club-{fmt}", 1080, L["H"])


def fondo_zoom():
    """Fondo virtual para las clases (1920×1080, lo máximo que usa Zoom).

    La persona tapa el centro y la parte baja, así que la marca va arriba a la
    izquierda y la dirección abajo a la derecha. Zoom te muestra tu imagen en
    espejo, pero los demás ven el texto al derecho.
    """
    W, H = p(1920), p(1080)
    img = fondo(W, H, [(0.18, -0.15, 0.6, 0.6, 0.20), (0.9, 1.15, 0.5, 0.4, 0.07)])
    placa, paso = p(118), p(15)
    x_pl, y_pl = p(96), p(90)
    cxp = x_pl + placa / 2
    img.alpha_composite(ecos_placa(W, H, cxp, y_pl + placa / 2, placa, 3, paso))
    img.alpha_composite(fe.marca(placa).convert("RGBA"), (x_pl, y_pl))
    d = ImageDraw.Draw(img)
    fe.tracked(d, cxp, y_pl + placa + 3 * paso + p(18), "BUSINESS CLUB", JL(p(16)), GOLD, p(6))

    f = JR(p(22))
    t = "VENTAS  ·  MARKETING  ·  ORATORIA"
    tracked_left(d, W - p(96) - fe.track_w(d, t, JM(p(18)), p(4)), H - p(118), t, JM(p(18)), MUTED, p(4))
    d.text((W - p(96) - d.textlength(URL_TXT, font=f), H - p(80)), URL_TXT, font=f, fill=GOLD)
    guardar(img, OUT / "zoom", "fondo-zoom-ecos", 1920, 1080)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--quedan", type=int, help="Genera solo la story «Quedan N lugares»")
    ap.add_argument("--flyer", action="store_true", help="Genera solo el flyer de siempre")
    ap.add_argument("--zoom", action="store_true", help="Genera solo el fondo de Zoom")
    a = ap.parse_args()
    if a.zoom:
        fondo_zoom()
        raise SystemExit
    if a.flyer:
        # El flyer se imprime y se ve en pantallas grandes: se arma a 4x
        # (4320×5400) para que se vea nítido en el computador o en papel.
        S = 4
        for fmt in FLYER:
            flyer(fmt)
    elif a.quedan is not None:
        quedan(a.quedan)
    else:
        carrusel()
        cuenta_regresiva()
