# -*- coding: utf-8 -*-
"""Flyer «Desde hoy, nuevos horarios» de ECOS (lun 9 nov 2026). Mismo estilo que
generar-flyer-oratoria.py: negro con halo dorado, sin foto, texto mínimo. Arriba
el logo del club (flyers/logo-ecos/ecos-lockup-1024.png), en el centro la semana
y abajo, pequeño, los 7 días de prueba de regalo y las horas por país.
Salidas: vertical 4x5 (feed) y story 9x16 (estados e historias).

    ./.venv/bin/python flyers/generar-flyer-horarios.py
"""
import pathlib
from PIL import Image, ImageDraw

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
# Se reutilizan fondo, fuentes y colores de la plantilla de oratoria sin ejecutarla.
_src = (PROJ / "flyers/generar-flyer-oratoria.py").read_text().split('\nprint("Generando')[0]
base = {}
exec(compile(_src, "generar-flyer-oratoria.py", "exec"), base)

S = base["S"]
GOLD, WHITE, MUTED, DIM = base["GOLD"], base["WHITE"], base["MUTED"], base["DIM"]
Q, JL, JR, JS = base["Q"], base["JL"], base["JR"], base["JS"]
background, tracked, HORAS = base["background"], base["tracked"], base["HORAS"]
OUT = PROJ / "flyers"

SEMANA = [("LUNES", "Ventas"), ("MARTES", "Oratoria"), ("JUEVES", "Oratoria"), ("VIERNES", "Marketing")]

FORMATOS = {
    "45": dict(H=1350, logo_y=70, logo=250, eb_y=380, h1_y=430, h1=92, filas_y=690, fila=58, gap=96,
               hora_y=1090, regalo_y=1185, regalo=30, horas_y=1240, nota=16),
    "916": dict(H=1920, logo_y=200, logo=320, eb_y=600, h1_y=660, h1=108, filas_y=980, fila=66, gap=120,
                hora_y=1500, regalo_y=1640, regalo=36, horas_y=1710, nota=19),
}


def build(fmt):
    k = FORMATOS[fmt]
    W1, H1 = 1080, k["H"]
    W, H = W1 * S, H1 * S
    sc = lambda v: int(v * S)
    img = background(W1, H1).resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    cx = W / 2

    # logo del club
    logo = Image.open(OUT / "logo-ecos/ecos-lockup-1024.png").convert("RGBA")
    lw = sc(k["logo"])
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    img.paste(logo, (int(cx - lw / 2), sc(k["logo_y"])), logo)

    # titular
    tracked(d, cx, sc(k["eb_y"]), "DESDE HOY", JR(sc(22)), MUTED, sc(7))
    y = sc(k["h1_y"])
    d.text((cx, y), "Nuevos", font=Q(sc(k["h1"] * 0.62)), fill=WHITE, anchor="ma")
    y += int(sc(k["h1"]) * 0.8)
    d.text((cx, y), "horarios", font=Q(sc(k["h1"])), fill=GOLD, anchor="ma")

    # la semana: día a la izquierda, clase a la derecha, con filete entre filas
    y = sc(k["filas_y"])
    izq, der = cx - sc(330), cx + sc(330)
    for i, (dia, clase) in enumerate(SEMANA):
        tracked_left = JS(sc(k["fila"] * 0.42))
        d.text((izq, y + sc(k["fila"] * 0.30)), dia, font=tracked_left, fill=GOLD)
        d.text((der, y), clase, font=Q(sc(k["fila"])), fill=WHITE, anchor="ra")
        if i < len(SEMANA) - 1:
            ly = y + sc(k["gap"]) - sc(k["gap"] - k["fila"]) // 2 + sc(4)
            d.line((izq, ly, der, ly), fill=(60, 52, 30), width=sc(1))
        y += sc(k["gap"])

    # la hora, igual para todas
    y = sc(k["hora_y"])
    d.line((cx - sc(40), y - sc(30), cx + sc(40), y - sc(30)), fill=GOLD, width=sc(2))
    d.text((cx, y), "Todas a las 8:00 p. m. · hora de Miami", font=JL(sc(34 if fmt == "45" else 40)), fill=WHITE, anchor="ma")

    # abajo, pequeño: el regalo y las horas por país
    y = sc(k["regalo_y"])
    d.text((cx, y), "7 días de prueba de regalo", font=Q(sc(k["regalo"])), fill=GOLD, anchor="ma")
    y = sc(k["horas_y"])
    for i, t in enumerate(HORAS):
        tracked(d, cx, y, t, JR(sc(k["nota"])), MUTED if i == 0 else DIM, sc(k["nota"]) * 0.22)
        y += int(sc(k["nota"]) * 1.8)

    suffix = {"45": "vertical-4x5", "916": "story-9x16"}[fmt]
    img.resize((W1, H1), Image.LANCZOS).save(OUT / f"ecos-horarios-2026-11-09-{suffix}.png", optimize=True)
    print(f"  {suffix}: {W1}x{H1}")


print("Generando flyer de horarios…")
build("45")
build("916")
