# -*- coding: utf-8 -*-
"""Dos flyers minimalistas, sin foto ni QR, para los embajadores:
Diagnóstico de empresa y Sesión de Claridad (personas).

El embajador comparte la imagen y, aparte, su enlace de agenda (con su ?ref=).
Reusa el fondo y los textos con tracking de generar-flyer.py (misma marca).

    ../.venv/bin/python flyers/generar-flyer-claridad-empresa-personas.py
"""
import pathlib

AQUI = pathlib.Path(__file__).resolve().parent
_src = (AQUI / "generar-flyer.py").read_text(encoding="utf-8")
exec(_src.split("\ndef build(")[0])  # constantes, fuentes y ayudantes de dibujo (sin generar nada)

from PIL import Image, ImageDraw  # noqa: E402

PIEZAS = {
    "empresa": {
        "archivo": "diagnostico-empresa",
        "eyebrow": "DIAGNÓSTICO DE EMPRESA",
        "blanco": "¿Sabes qué necesita",
        "dorado": "tu empresa para crecer?",
        "escala": 0.86,  # titular más largo: así cabe en dos líneas
        "tema": "dw",    # morado y logo de DelegaWork, para distinguirlo del de personas
        "bajada": "Un diagnóstico de 30 minutos por Zoom para ver con claridad dónde está hoy "
                  "tu empresa y hacia dónde llevarla. Gratuito.",
        "lleva": ["Una mirada clara de cómo está tu empresa hoy",
                  "Las áreas que más te van a hacer avanzar",
                  "Tu siguiente paso, con prioridades claras"],
        "cta": "Agenda con el enlace que te compartieron",
        "pie": "PARA DUEÑOS DE NEGOCIO Y EMPRENDEDORES",
    },
    "personas": {
        "archivo": "claridad-personas",
        "eyebrow": "SESIÓN DE CLARIDAD",
        "blanco": "¿Sabes cuál es tu",
        "dorado": "siguiente paso?",
        "bajada": "30 minutos por Zoom para ordenar tus ideas, reconocer tus talentos "
                  "y elegir hacia dónde ir. Gratuita.",
        "lleva": ["Claridad sobre lo que quieres construir",
                  "Los talentos que ya tienes para lograrlo",
                  "Tu siguiente paso, con un plan sencillo"],
        "cta": "Agenda con el enlace que te compartieron",
        "pie": "CON HOLMAN O ALGUIEN DE SU EQUIPO",
    },
}

LINEA = (46, 53, 62)

# --- tema DelegaWork (paleta y fuente de delegawork.com) ---
VIOLETA = (139, 92, 246)   # #8b5cf6
LILA    = (196, 181, 253)  # #c4b5fd
GEIST = PROJ / "redes/remotion/public/delegawork"
G = lambda peso, px: ImageFont.truetype(str(GEIST / f"Geist-{peso}.ttf"), px)
LOGO_DW = PROJ / "docs/delegawork/folleto/img/logo-app.png"


def fondo_dw(w, h):
    """Como background(), pero con el resplandor en violeta."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h

    def halo(cx, cy, rx, ry, strength, falloff):
        dd = np.sqrt(((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2)
        return np.clip(1.0 - dd, 0.0, 1.0) ** falloff * strength

    glow = halo(0.5, -0.06, 0.80, 0.45, 0.30, 1.5) + halo(0.5, 1.08, 0.60, 0.32, 0.16, 1.6)
    glow = np.clip(glow, 0, 1)[..., None]
    base = np.array(BG, np.float32)[None, None, :]
    tinte = np.array((124, 58, 237), np.float32)[None, None, :]
    arr = base * (1 - glow) + tinte * glow
    rng = np.random.default_rng(7)
    arr = np.clip(arr + rng.normal(0, 9, (h, w, 1)).astype(np.float32), 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def centrar(d, cx, y, texto, font, fill):
    d.text((cx - d.textlength(texto, font=font) / 2, y), texto, font=font, fill=fill)


def build(clave, fmt):
    p = PIEZAS[clave]
    W1 = 1080
    H1 = {"45": 1350, "916": 1920}[fmt]
    W, H = W1 * S, H1 * S
    sc = lambda v: int(v * S)
    dw = p.get("tema") == "dw"
    ACC, ACC_H = (VIOLETA, LILA) if dw else (GOLD, GOLD)
    img = fondo_dw(W, H) if dw else background(W, H)
    d = ImageDraw.Draw(img)
    cx = W // 2

    if fmt == "45":
        pad_top, pad_bot = 70, 70
        logo_px, wm_px, eb_px, h1_px, sub_px, item_px, cta_px, pie_px = 40, 12, 16, 78, 22, 27, 22, 13
    else:  # story: deja libres arriba y abajo las zonas de la interfaz
        pad_top, pad_bot = 190, 260
        logo_px, wm_px, eb_px, h1_px, sub_px, item_px, cta_px, pie_px = 46, 14, 18, 88, 25, 30, 24, 14

    h1_px = h1_px * p.get("escala", 1)
    f_wm, f_eb, f_h1 = JR(sc(wm_px)), JS(sc(eb_px)), Q(sc(h1_px))
    f_sub, f_item, f_cta, f_pie = JL(sc(sub_px)), JL(sc(item_px)), JM(sc(cta_px)), JR(sc(pie_px))
    if dw:
        logo_px = {"45": 170, "916": 200}[fmt]
        f_wm = G(600, sc(wm_px * 2.2))
        f_eb, f_h1 = G(600, sc(eb_px)), G(500, sc(h1_px * 0.94))
        f_sub, f_item, f_cta, f_pie = G(400, sc(sub_px)), G(400, sc(item_px * 0.95)), G(500, sc(cta_px)), G(400, sc(pie_px))

    # ---------- medir ----------
    max_w = W - sc(140)
    tokens = [(w, WHITE) for w in p["blanco"].split()] + [("|BR|", None)] + \
             [(w, ACC_H) for w in p["dorado"].split()]
    h1_lines, h1_space = wrap_rich(d, tokens, f_h1, max_w)
    h1_lh = int(sc(h1_px) * 1.16)

    sub_lines, sub_space = wrap_rich(d, [(w, MUTED) for w in p["bajada"].split()], f_sub, sc(720))
    sub_lh = int(sc(sub_px) * 1.55)

    marca_h = sc(logo_px) + sc(16) + (f_wm.size if dw else sc(wm_px))
    titulo_h = sc(eb_px) + sc(34) + h1_lh * len(h1_lines) + sc(30) + sub_lh * len(sub_lines)
    item_lh = int(sc(item_px) * 2.2)
    f_lbl = G(600, sc(eb_px - 3)) if dw else JS(sc(eb_px - 3))
    lista_h = sc(eb_px - 3) + sc(44) + item_lh * len(p["lleva"]) + sc(40) + sc(1)
    cta_h = sc(cta_px)
    pie_h = sc(pie_px) + sc(10) + sc(pie_px + 3)

    libre = H - sc(pad_top) - sc(pad_bot) - (marca_h + titulo_h + lista_h + cta_h + pie_h)
    pesos = [1.25, 0.9, 0.8, 1.1]  # marca-título, título-lista, lista-cta, cta-pie
    if libre < 0:
        print(f"  ¡ojo! {clave} {fmt}: faltan {int(-libre / S)} px")
        libre = 0
    gaps = [libre * w / sum(pesos) for w in pesos]

    # ---------- dibujar ----------
    y = sc(pad_top)
    logo = Image.open(LOGO_DW if dw else PROJ / "public/logo-h.png").convert("RGBA")
    logo = logo.resize((sc(logo_px), sc(logo_px)), Image.LANCZOS)
    img.paste(logo, (cx - sc(logo_px) // 2, y), logo)
    if dw:
        centrar(d, cx, y + sc(logo_px) + sc(10), "DelegaWork", f_wm, WHITE)
    else:
        draw_tracked(d, cx, y + sc(logo_px) + sc(16), "HOLMAN GLOBAL GROUP", f_wm, DIM, sc(wm_px) * 0.4)
    y += marca_h + gaps[0]

    draw_tracked(d, cx, y, p["eyebrow"], f_eb, ACC, sc(eb_px) * (0.3 if dw else 0.42))
    y += sc(eb_px) + sc(34)
    y = draw_rich(d, cx, y, h1_lines, h1_space, f_h1, h1_lh)
    y += sc(30) - (h1_lh - sc(h1_px))
    y = draw_rich(d, cx, y, sub_lines, sub_space, f_sub, sub_lh)
    y += gaps[1] - (sub_lh - sc(sub_px))

    # --- lo que te llevas ---
    draw_tracked(d, cx, y, "LO QUE TE LLEVAS", f_lbl, ACC, sc(eb_px - 3) * (0.3 if dw else 0.4))
    y += sc(eb_px - 3) + sc(44)
    for t in p["lleva"]:
        centrar(d, cx, y, t, f_item, WHITE)
        y += item_lh
    y += sc(40) - (item_lh - sc(item_px))
    d.line([(cx - sc(36), y), (cx + sc(36), y)], fill=LINEA, width=sc(1))
    y += sc(1) + gaps[2]

    # --- invitación: solo texto (Josefin no trae flecha) ---
    centrar(d, cx, y, p["cta"], f_cta, LILA if dw else GOLD)
    y += cta_h + gaps[3]

    draw_tracked(d, cx, y, p["pie"], f_pie, DIM, sc(pie_px) * 0.36)
    y += sc(pie_px) + sc(10)
    sitio = "delegawork.com" if dw else "holmanglobalgroup.com"
    f_sitio = G(500, sc(pie_px + 3)) if dw else JR(sc(pie_px + 3))
    draw_tracked(d, cx, y, sitio, f_sitio, MUTED, sc(pie_px) * 0.12)

    suf = {"45": "vertical-4x5", "916": "story-9x16"}[fmt]
    nombre = f"{p['archivo']}-{suf}.png"
    img.resize((W1, H1), Image.LANCZOS).save(OUT / nombre, optimize=True)
    print("  ", nombre)


print("Generando flyers de empresa y personas…")
import sys
for clave in (sys.argv[1:] or PIEZAS):
    for fmt in ("45", "916"):
        build(clave, fmt)
