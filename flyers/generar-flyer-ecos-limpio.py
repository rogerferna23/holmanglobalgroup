# -*- coding: utf-8 -*-
"""Flyer limpio de ECOS Business Club: para compartir en grupos (p. ej. el de
coaches) junto a un mensaje que ya trae la invitación.

Sin precio, sin QR y sin llamado a la acción: la pieza presenta el club y el
mensaje hace la invitación («escríbeme al privado»). Mismo fondo, placa y
tipografías que generar-flyer-ecos.py, del que toma las piezas.

    python3 flyers/generar-flyer-ecos-limpio.py
"""
import importlib.util
import pathlib

from PIL import Image, ImageDraw

AQUI = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("base", AQUI / "generar-flyer-ecos.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

S, GOLD, WHITE, MUTED, DIM = base.S, base.GOLD, base.WHITE, base.MUTED, base.DIM
Q, JL, JM = base.Q, base.JL, base.JM

PILARES = [
    ("CLASES EN VIVO", "Todas las semanas, con práctica real"),
    ("PLATAFORMA", "Grabaciones, material de estudio y tu avance"),
    ("COMUNIDAD", "Profesionales que se conocen y se recomiendan"),
    ("EMBAJADORES", "10% de comisión por cada persona que recomiendes"),
]


def centrado(d, cx, y, texto, fuente, color):
    b = d.textbbox((0, 0), texto, font=fuente)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], y - b[1]), texto, font=fuente, fill=color)


def build(fmt):
    W1 = 1080
    H1 = {"45": 1350, "11": 1080}[fmt]
    W, H = W1 * S, H1 * S
    img = base.background(W, H)
    d = ImageDraw.Draw(img)
    cx = W // 2

    esc = {"45": 1.0, "11": 0.84}[fmt]
    p = lambda v: int(v * S * esc)

    # Se arma de arriba hacia abajo y al final se centra verticalmente todo el
    # bloque, para que no quede aire de más abajo al no haber pie.
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dc = ImageDraw.Draw(capa)
    y = 0

    pl = base.marca(p(168))
    capa.paste(pl, (cx - pl.width // 2, y), pl)
    y += pl.height + p(26)
    base.tracked(dc, cx, y, "BUSINESS CLUB", JL(p(19)), GOLD, p(7))
    y += p(74)

    for linea in ["Las habilidades que", "tu negocio necesita."]:
        centrado(dc, cx, y, linea, Q(p(54)), WHITE)
        y += p(66)
    y += p(18)

    centrado(dc, cx, y, "Ventas, marketing y oratoria:", JL(p(27)), MUTED)
    y += p(38)
    centrado(dc, cx, y, "la misma habilidad, comunicar.", JL(p(27)), MUTED)
    y += p(62)

    dc.line([(cx - p(90), y), (cx + p(90), y)], fill=(205, 146, 58, 150), width=max(1, p(1)))
    y += p(56)

    for titulo, texto in PILARES:
        base.tracked(dc, cx, y, titulo, JM(p(22)), GOLD, p(4))
        y += p(34)
        centrado(dc, cx, y, texto, JL(p(22)), WHITE if titulo == "EMBAJADORES" else MUTED)
        y += p(58)
    y -= p(58)
    y += p(40)

    logo = Image.open(base.PROJ / "public/logo-h.png").convert("RGBA")
    lw = p(34)
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    y += p(24)
    capa.paste(logo, (cx - logo.width // 2, y), logo)
    y += logo.height

    arriba = (H - y) // 2
    img.paste(capa.crop((0, 0, W, y)), (0, arriba), capa.crop((0, 0, W, y)))

    nombre = {"45": "vertical-4x5", "11": "cuadrado-1x1"}[fmt]
    img.resize((W1, H1), Image.LANCZOS).save(base.OUT / f"ecos-club-limpio-{nombre}.png")
    print(f"  ✓ ecos-club-limpio-{nombre}.png  ({W1}x{H1})")


if __name__ == "__main__":
    for f in ("45", "11"):
        build(f)
