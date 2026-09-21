# -*- coding: utf-8 -*-
"""Flyer Sesión de Claridad — HGG. Paleta y tipografías de marca."""
import pathlib, urllib.parse
import numpy as np
import segno
from PIL import Image, ImageDraw, ImageFont

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT  = PROJ / "flyers"
FONTS = pathlib.Path.home() / "Library/Fonts"
S = 2  # supermuestreo

BG      = (11, 16, 22)
GOLD    = (240, 184, 0)
WHITE   = (255, 255, 255)
MUTED   = (184, 190, 199)
DIM     = (107, 115, 128)

Q  = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px)
JL = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Light.ttf"), px)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px)
JM = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Medium.ttf"), px)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px)

WA_TEXT = "Hola, quiero mi Sesión de Claridad"
WA_URL  = "https://wa.me/12099641747?text=" + urllib.parse.quote(WA_TEXT)


def qr_image(px_scale):
    """QR nativo, sin reescalado: módulos perfectamente cuadrados."""
    qr = segno.make(WA_URL, error="m")   # M (15%): menos módulos, mejor lectura a tamaño pequeño
    buf = OUT / f".qr-tmp-{px_scale}.png"
    qr.save(str(buf), scale=px_scale, border=4, dark="#0B1016", light="#FFFFFF")
    img = Image.open(buf).convert("RGB")
    buf.unlink()
    return img


def hero_portrait(diam):
    """Retrato circular al estilo del hero del sitio: aro dorado difuso y halo cálido.
    Devuelve un RGBA más grande que `diam` (el halo necesita margen); se pega centrado."""
    SS = 2
    pad = int(diam * 0.26)
    total = (diam + pad * 2)
    D, T = diam * SS, total * SS
    R = D / 2.0
    c = T / 2.0

    src = Image.open(PROJ / "public/holman.webp").convert("RGB")
    W0, H0 = src.size
    side = int(W0 * 0.84)                       # cabeza y torso dentro del círculo
    cx0, cy0 = int(W0 * 0.49), int(H0 * 0.39)
    face = src.crop((cx0 - side // 2, cy0 - side // 2,
                     cx0 + side // 2, cy0 + side // 2)).resize((D, D), Image.LANCZOS)

    yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
    r = np.sqrt((xx - c) ** 2 + (yy - c) ** 2)

    # halo cálido alrededor del aro: cobre tenue, como en el hero del sitio
    COBRE = (176, 116, 38)
    sig = max(pad * SS * 0.80, 1.0)
    halo = np.exp(-((r - R) ** 2) / (2 * sig ** 2)) * 52.0
    halo[r < R * 0.96] = 0.0
    # se apaga del todo antes de llegar al canto del lienzo: sin esto el recorte
    # rectangular del halo se ve como un cuadrado claro detrás de la foto
    halo *= np.clip((c - r) / (c - R), 0.0, 1.0) ** 2
    layer = np.zeros((T, T, 4), np.float32)
    layer[..., 0], layer[..., 1], layer[..., 2] = COBRE
    layer[..., 3] = halo

    out = Image.fromarray(np.clip(layer, 0, 255).astype(np.uint8), "RGBA")

    # foto recortada en círculo, con el canto suavizado para que funda con el fondo
    edge = 2.0 * SS
    mask = np.clip((R - edge - r) / edge + 1.0, 0.0, 1.0) * 255.0
    photo = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    photo.paste(face, (int(c - R), int(c - R)))
    photo.putalpha(Image.fromarray(mask.astype(np.uint8), "L"))
    out = Image.alpha_composite(out, photo)

    # aro: un filete nítido sobre el halo
    w = 2.4 * SS
    ring = np.clip((w / 2 - np.abs(r - R)) / (1.2 * SS) + 0.5, 0.0, 1.0) * 165.0
    rl = np.zeros((T, T, 4), np.float32)
    rl[..., 0], rl[..., 1], rl[..., 2] = (205, 146, 58)
    rl[..., 3] = ring
    out = Image.alpha_composite(out, Image.fromarray(np.clip(rl, 0, 255).astype(np.uint8), "RGBA"))

    return out.resize((total, total), Image.LANCZOS)


def background(w, h):
    """Fondo oscuro + halo dorado superior + rescoldo inferior + grano."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h

    def halo(cx, cy, rx, ry, strength, falloff):
        d = np.sqrt(((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2)
        return np.clip(1.0 - d, 0.0, 1.0) ** falloff * strength

    glow = halo(0.5, -0.10, 0.70, 0.40, 0.22, 1.5) + halo(0.5, 1.08, 0.55, 0.30, 0.12, 1.6)
    glow = np.clip(glow, 0, 1)[..., None]

    base = np.array(BG, np.float32)[None, None, :]
    gold = np.array(GOLD, np.float32)[None, None, :]
    arr = base * (1 - glow) + gold * glow

    rng = np.random.default_rng(7)
    grain = rng.normal(0, 18, (h, w, 1)).astype(np.float32) * 0.5
    arr = np.clip(arr + grain, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def track_width(draw, text, font, tracking):
    return sum(draw.textlength(c, font=font) for c in text) + tracking * max(len(text) - 1, 0)


def draw_tracked(draw, cx, y, text, font, fill, tracking):
    """Texto centrado en cx con letter-spacing manual."""
    x = cx - track_width(draw, text, font, tracking) / 2
    for c in text:
        draw.text((x, y), c, font=font, fill=fill)
        x += draw.textlength(c, font=font) + tracking


def wrap_rich(draw, tokens, font, max_w):
    """tokens = [(palabra, color)]. Devuelve líneas envueltas conservando color."""
    space = draw.textlength(" ", font=font)
    lines, cur, cur_w = [], [], 0.0
    for word, color in tokens:
        if word == "|BR|":
            if cur:
                lines.append(cur); cur, cur_w = [], 0.0
            continue
        w = draw.textlength(word, font=font)
        add = w if not cur else space + w
        if cur and cur_w + add > max_w:
            lines.append(cur)
            cur, cur_w = [(word, color, w)], w
        else:
            cur.append((word, color, w))
            cur_w += add
    if cur:
        lines.append(cur)
    return lines, space


def draw_rich(draw, cx, y, lines, space, font, line_h, align="center"):
    for line in lines:
        total = sum(w for _, _, w in line) + space * (len(line) - 1)
        x = cx if align == "left" else cx - total / 2
        for word, color, w in line:
            draw.text((x, y), word, font=font, fill=color)
            x += w + space
        y += line_h
    return y


def build(fmt):
    """fmt: '45' (1080x1350), '11' (1080x1080) o '916' (1080x1920, story).

    El vertical se arma en dos fases: primero se mide la altura real de cada
    bloque y después se reparte el aire sobrante entre los huecos, con un
    mínimo y un peso por hueco. Así los espacios quedan proporcionados en los
    tres formatos sin números a ojo."""
    W1 = 1080
    H1 = {"45": 1350, "11": 1080, "916": 1920}[fmt]
    W, H = W1 * S, H1 * S
    img = background(W, H)
    d = ImageDraw.Draw(img)
    cx = W // 2

    if fmt == "45":
        pad_top, pad_x, pad_bot = 54, 70, 54
        avatar_px, role_px, eb_px = 430, 13, 16
        h1_px, lead_px = 46, 25
        qr_pad, logo_px, wm_px = 6, 40, 13
        scan_px, sub_px, or_px, phone_px = 24, 17, 13, 34
        pil_px, site_px = 13, 17
        # huecos: (mínimo, peso con el que crece al repartir el sobrante)
        huecos = {"marca_hero": (34, 0.0), "hero_lead": (46, 1.0), "lead_rule": (34, 0.0),
                  "rule_qr": (46, 1.15), "qr_pie": (46, 0.85)}
    elif fmt == "916":
        pad_top, pad_x, pad_bot = 104, 70, 200
        avatar_px, role_px, eb_px = 470, 15, 18
        h1_px, lead_px = 50, 28
        qr_pad, logo_px, wm_px = 12, 48, 15
        scan_px, sub_px, or_px, phone_px = 28, 19, 15, 40
        pil_px, site_px = 15, 19
        huecos = {"marca_hero": (44, 0.0), "hero_lead": (54, 1.0), "lead_rule": (40, 0.0),
                  "rule_qr": (54, 1.15), "qr_pie": (54, 0.85)}
    else:
        pad_top, pad_x, pad_bot = 46, 64, 46
        avatar_px, role_px, eb_px = 330, 12, 14
        h1_px, lead_px = 38, 21
        qr_pad, logo_px, wm_px = 5, 34, 11
        scan_px, sub_px, or_px, phone_px = 20, 15, 11, 29
        pil_px, site_px = 12, 15
        huecos = {"marca_hero": (26, 0.0), "hero_lead": (34, 1.0), "lead_rule": (26, 0.0),
                  "rule_qr": (34, 1.15), "qr_pie": (34, 0.85)}

    sc = lambda v: int(v * S)

    # ================= FASE 1 · medir =================
    f_eb, f_h1 = JS(sc(eb_px)), Q(sc(h1_px))
    f_lead, f_lead_b = JL(sc(lead_px)), JM(sc(lead_px))
    f_scan, f_sub = JM(sc(scan_px)), JL(sc(sub_px))
    f_or, f_ph = JL(sc(or_px)), Q(sc(phone_px))
    f_role, f_wm = JR(sc(role_px)), JR(sc(wm_px))
    f_pil, f_site = JR(sc(pil_px)), JM(sc(site_px))

    logo_gap = sc({"45": 13, "11": 11, "916": 20}[fmt])
    marca_h = sc(logo_px) + logo_gap + sc(wm_px)

    diam = sc(avatar_px)
    col_gap = sc(34)
    col_w = W - sc(pad_x) * 2 - diam - col_gap
    tokens = [(w, WHITE) for w in "¿Tienes una idea, una marca o un negocio y quieres saber cuál es".split()]
    tokens += [("|BR|", None)] + [(w, GOLD) for w in "tu siguiente paso?".split()]
    h1_lines, h1_space = wrap_rich(d, tokens, f_h1, col_w)
    h1_lh = int(sc(h1_px) * 1.2)
    txt_h = sc(eb_px) + sc(18) + h1_lh * len(h1_lines)
    role_gap = sc(14)
    hero_h = max(txt_h, diam + role_gap + sc(role_px))

    lead_words = [("En", 0), ("30", 1), ("minutos", 1), ("por", 1), ("Zoom", 1), ("entiendes", 0),
                  ("dónde", 0), ("estás", 0), ("hoy,", 0), ("qué", 0), ("necesitas", 0), ("hacer", 0),
                  ("y", 0), ("cómo", 0), ("avanzar", 0), ("con", 0), ("un", 0), ("plan", 0), ("claro.", 0)]
    lead_max = sc({"45": 800, "11": 780, "916": 800}[fmt])
    sp = d.textlength(" ", font=f_lead)
    lead_lines, cur, cur_w = [], [], 0.0
    for word, bold in lead_words:
        f = f_lead_b if bold else f_lead
        w = d.textlength(word, font=f)
        add = w if not cur else sp + w
        if cur and cur_w + add > lead_max:
            lead_lines.append(cur); cur, cur_w = [(word, f, WHITE if bold else MUTED, w)], w
        else:
            cur.append((word, f, WHITE if bold else MUTED, w)); cur_w += add
    if cur: lead_lines.append(cur)
    lead_lh = int(sc(lead_px) * 1.62)
    lead_h = lead_lh * len(lead_lines)

    qr_scale = ({"45": 10, "11": 10, "916": 12}[fmt]) if S == 2 else 5
    qr = qr_image(qr_scale)
    card = qr.width + sc(qr_pad) * 2

    pie_rule_gap = sc({"45": 24, "11": 18, "916": 28}[fmt])
    pie_h = 1 + pie_rule_gap + int(sc(pil_px) * 1.35) + sc(6) + int(sc(site_px) * 1.35)

    # ================= FASE 2 · repartir el aire =================
    bloques = marca_h + hero_h + lead_h + 1 + card + pie_h
    libre = H - sc(pad_top) - sc(pad_bot) - bloques
    minimos = sum(sc(m) for m, _ in huecos.values())
    sobra = libre - minimos
    if sobra < 0:
        print(f"    ¡ojo! en {fmt} faltan {int(-sobra / S)} px: el contenido no entra")
        sobra = 0
    peso_total = sum(w for _, w in huecos.values()) or 1
    g = {k: sc(m) + sobra * w / peso_total for k, (m, w) in huecos.items()}

    # ================= FASE 3 · dibujar =================
    y = sc(pad_top)

    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA")
    logo = logo.resize((sc(logo_px), sc(logo_px)), Image.LANCZOS)
    img.paste(logo, (cx - sc(logo_px) // 2, y), logo)
    draw_tracked(d, cx, y + sc(logo_px) + logo_gap, "HOLMAN GLOBAL GROUP LLC",
                 f_wm, MUTED, sc(wm_px) * 0.38)
    y += marca_h + g["marca_hero"]

    # --- la pregunta a la izquierda, el retrato a la derecha ---
    left_x = sc(pad_x)
    por = hero_portrait(diam)
    img.paste(por, (W - sc(pad_x) - diam + (diam - por.width) // 2,
                    int(y + (hero_h - diam) / 2) - (por.height - diam) // 2), por)
    draw_tracked(d, W - sc(pad_x) - diam // 2,
                 int(y + (hero_h + diam) / 2) + role_gap, "HOLMAN ORJUELA · FUNDADOR",
                 f_role, MUTED, sc(role_px) * 0.28)

    ty = int(y + (hero_h - txt_h) / 2)
    draw_tracked(d, left_x + track_width(d, "SESIÓN DE CLARIDAD · GRATUITA", f_eb,
                 sc(eb_px) * 0.28) / 2, ty, "SESIÓN DE CLARIDAD · GRATUITA",
                 f_eb, GOLD, sc(eb_px) * 0.28)
    draw_rich(d, left_x, ty + sc(eb_px) + sc(18), h1_lines, h1_space, f_h1, h1_lh, align="left")
    y += hero_h + g["hero_lead"]

    # --- bajada ---
    for line in lead_lines:
        total = sum(w for *_, w in line) + sp * (len(line) - 1)
        x = cx - total / 2
        for word, f, color, w in line:
            d.text((x, y), word, font=f, fill=color)
            x += w + sp
        y += lead_lh
    y += g["lead_rule"] - (lead_lh - sc(lead_px))

    d.line([(cx - sc(60), y), (cx + sc(60), y)], fill=(46, 53, 62), width=max(1, S // 2))
    y += 1 + g["rule_qr"]

    # --- QR + CTA, en horizontal ---
    from PIL import ImageFilter
    t_scan = "Escanea y agenda tu sesión por WhatsApp"
    t_sub  = "Te atiende Sofía, nuestra asistente virtual"
    t_ph   = "+1 (209) 964-1747"
    or_w = track_width(d, "O ESCRIBE AL", f_or, sc(or_px) * 0.16)
    tw = max(d.textlength(t_scan, font=f_scan), d.textlength(t_sub, font=f_sub),
             or_w + sc(12) + d.textlength(t_ph, font=f_ph))

    gap_qr = sc(34)
    bx = int(cx - (card + gap_qr + tw) / 2)
    bx -= bx % S
    qy = int(y)

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [bx, qy + sc(8), bx + card, qy + card + sc(8)], radius=sc(18), fill=(0, 0, 0, 150))
    img.paste(Image.alpha_composite(img.convert("RGBA"),
              shadow.filter(ImageFilter.GaussianBlur(sc(14)))).convert("RGB"), (0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([bx, qy, bx + card, qy + card], radius=sc(18),
                        fill=WHITE, outline=GOLD, width=max(1, S // 2))
    img.paste(qr, (bx + sc(qr_pad), qy + sc(qr_pad)))
    qr_pos = (bx + sc(qr_pad), qy + sc(qr_pad))

    th = sc(scan_px) + sc(12) + sc(sub_px) + sc(22) + max(sc(or_px), sc(phone_px))
    tx, ty2 = bx + card + gap_qr, qy + (card - th) / 2
    d.text((tx, ty2), t_scan, font=f_scan, fill=WHITE)
    ty2 += sc(scan_px) + sc(12)
    d.text((tx, ty2), t_sub, font=f_sub, fill=MUTED)
    ty2 += sc(sub_px) + sc(22)
    draw_tracked(d, tx + or_w / 2, ty2 + (sc(phone_px) - sc(or_px)) * 0.62,
                 "O ESCRIBE AL", f_or, DIM, sc(or_px) * 0.16)
    d.text((tx + or_w + sc(12), ty2), t_ph, font=f_ph, fill=GOLD)
    y = qy + card + g["qr_pie"]

    # --- pie ---
    d.line([(sc(pad_x), y), (W - sc(pad_x), y)], fill=(30, 36, 43), width=max(1, S // 2))
    y += 1 + pie_rule_gap
    draw_tracked(d, cx, y, "SENTIDO · MARCA · SISTEMA", f_pil, DIM, sc(pil_px) * 0.36)
    y += int(sc(pil_px) * 1.35) + sc(6)
    draw_tracked(d, cx, y, "holmanglobalgroup.com", f_site, MUTED, sc(site_px) * 0.12)

    # ---- salidas ----
    suffix = {"45": "vertical-4x5", "11": "cuadrado-1x1", "916": "story-9x16"}[fmt]
    n_mod = qr.width // qr_scale
    QR_POS[f"flyer-sesion-claridad-{suffix}@2x.png"] = (qr_pos[0], qr_pos[1], qr.width, n_mod)
    img.save(OUT / f"flyer-sesion-claridad-{suffix}@2x.png", optimize=True)

    small = img.resize((W1, H1), Image.LANCZOS)
    qr1 = qr_image(qr_scale // 2)
    small.paste(qr1, (qr_pos[0] // S, qr_pos[1] // S))
    QR_POS[f"flyer-sesion-claridad-{suffix}.png"] = (qr_pos[0] // S, qr_pos[1] // S, qr1.width, n_mod)
    small.save(OUT / f"flyer-sesion-claridad-{suffix}.png", optimize=True)
    print(f"  {suffix}: {W1}x{H1} y {W}x{H}   aire repartido: "
          + "  ".join(f"{k} {int(v/S)}" for k, v in g.items()))


QR_POS = {}   # archivo -> (x, y, lado en px, módulos por lado)

print("Generando flyers…")
build("45")
build("11")
build("916")
segno.make(WA_URL, error="m").save(str(OUT / "qr-sofia.png"), scale=24, border=2,
                                   dark="#0B1016", light="#FFFFFF")
print("QR suelto: flyers/qr-sofia.png")

import json
(OUT / ".qr-pos.json").write_text(json.dumps(QR_POS, indent=1))
