# -*- coding: utf-8 -*-
"""Flyer Programa Fundador — HGG (oct 2026). Mismo sistema que generar-flyer.py:
fondo oscuro con halo dorado, Questrial + Josefin Sans, retrato con aro.
Sin QR ni número: Holman lo envía por chat directo a cada persona.
Salidas: vertical 4x5 (feed) y story 9x16 (estados e historias)."""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

PROJ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
OUT  = PROJ / "flyers"
FONTS = pathlib.Path.home() / "Library/Fonts"
S = 2  # supermuestreo

BG    = (11, 16, 22)
SURF  = (14, 20, 28)
GOLD  = (240, 184, 0)
WHITE = (255, 255, 255)
MUTED = (184, 190, 199)
DIM   = (107, 115, 128)
LINE  = (38, 45, 54)

Q  = lambda px: ImageFont.truetype(str(FONTS / "Questrial-Regular.ttf"), px)
JL = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Light.ttf"), px)
JR = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Regular.ttf"), px)
JM = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-Medium.ttf"), px)
JS = lambda px: ImageFont.truetype(str(FONTS / "JosefinSans-SemiBold.ttf"), px)

BENEFICIOS = [
    ("2 sesiones 1 a 1", "conmigo, por Zoom"),
    ("Plan de acción", "claro para tus próximos 90 días"),
    ("ECOS Business Club", "de regalo: clases en vivo y comunidad"),
    ("Mes a mes", "sigues si te sirve, sin permanencia"),
]


def hero_portrait(diam):
    """Retrato circular con aro dorado y halo cobre (igual que el flyer de Claridad)."""
    SS = 2
    pad = int(diam * 0.26)
    total = diam + pad * 2
    D, T = diam * SS, total * SS
    R, c = D / 2.0, T / 2.0

    src = Image.open(PROJ / "public/holman.webp").convert("RGB")
    W0, H0 = src.size
    side = int(W0 * 0.84)
    cx0, cy0 = int(W0 * 0.49), int(H0 * 0.39)
    face = src.crop((cx0 - side // 2, cy0 - side // 2,
                     cx0 + side // 2, cy0 + side // 2)).resize((D, D), Image.LANCZOS)

    yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
    r = np.sqrt((xx - c) ** 2 + (yy - c) ** 2)
    sig = max(pad * SS * 0.80, 1.0)
    halo = np.exp(-((r - R) ** 2) / (2 * sig ** 2)) * 52.0
    halo[r < R * 0.96] = 0.0
    halo *= np.clip((c - r) / (c - R), 0.0, 1.0) ** 2
    layer = np.zeros((T, T, 4), np.float32)
    layer[..., 0], layer[..., 1], layer[..., 2] = (176, 116, 38)
    layer[..., 3] = halo
    out = Image.fromarray(np.clip(layer, 0, 255).astype(np.uint8), "RGBA")

    edge = 2.0 * SS
    mask = np.clip((R - edge - r) / edge + 1.0, 0.0, 1.0) * 255.0
    photo = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    photo.paste(face, (int(c - R), int(c - R)))
    photo.putalpha(Image.fromarray(mask.astype(np.uint8), "L"))
    out = Image.alpha_composite(out, photo)

    w = 2.4 * SS
    ring = np.clip((w / 2 - np.abs(r - R)) / (1.2 * SS) + 0.5, 0.0, 1.0) * 165.0
    rl = np.zeros((T, T, 4), np.float32)
    rl[..., 0], rl[..., 1], rl[..., 2] = (205, 146, 58)
    rl[..., 3] = ring
    out = Image.alpha_composite(out, Image.fromarray(np.clip(rl, 0, 255).astype(np.uint8), "RGBA"))
    return out.resize((total, total), Image.LANCZOS)


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
    """anchor 'c' = x es el centro; 'l' = x es el borde izquierdo."""
    if anchor == "c":
        x -= track_width(d, text, font, tracking) / 2
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking


def wrap_rich(d, tokens, font, max_w):
    space = d.textlength(" ", font=font)
    lines, cur, cur_w = [], [], 0.0
    for word, color in tokens:
        if word == "|BR|":
            if cur:
                lines.append(cur); cur, cur_w = [], 0.0
            continue
        w = d.textlength(word, font=font)
        add = w if not cur else space + w
        if cur and cur_w + add > max_w:
            lines.append(cur); cur, cur_w = [(word, color, w)], w
        else:
            cur.append((word, color, w)); cur_w += add
    if cur:
        lines.append(cur)
    return lines, space


def build(fmt):
    W1, H1 = 1080, {"45": 1350, "916": 1920}[fmt]
    W, H = W1 * S, H1 * S
    img = background(W, H)
    d = ImageDraw.Draw(img)
    cx = W // 2
    sc = lambda v: int(v * S)

    if fmt == "45":
        pad_top, pad_x, pad_bot = 50, 70, 46
        logo_px, wm_px, eb_px, h1_px, avatar_px, role_px = 38, 12, 15, 46, 340, 12
        card_h, ben_t, ben_s, price_px, per_px, note_px = 112, 22, 16, 64, 22, 16
        qr_pad, scan_px, sub_px, or_px, phone_px, pil_px, site_px = 6, 23, 16, 12, 30, 12, 16
        qr_scale = 8
        huecos = {"marca_hero": (26, 0.4), "hero_ben": (34, 1.0), "ben_precio": (30, 1.0),
                  "precio_pie": (40, 1.0)}
    else:
        pad_top, pad_x, pad_bot = 110, 70, 190
        logo_px, wm_px, eb_px, h1_px, avatar_px, role_px = 46, 14, 18, 52, 400, 14
        card_h, ben_t, ben_s, price_px, per_px, note_px = 134, 25, 18, 78, 26, 19
        qr_pad, scan_px, sub_px, or_px, phone_px, pil_px, site_px = 10, 27, 19, 14, 36, 14, 18
        qr_scale = 10
        huecos = {"marca_hero": (44, 0.4), "hero_ben": (50, 1.0), "ben_precio": (46, 1.0),
                  "precio_pie": (60, 1.0)}

    # ---------- medir ----------
    f_wm, f_eb, f_h1, f_role = JR(sc(wm_px)), JS(sc(eb_px)), Q(sc(h1_px)), JR(sc(role_px))
    f_bt, f_bs = JM(sc(ben_t)), JL(sc(ben_s))
    f_price, f_per, f_note = Q(sc(price_px)), JL(sc(per_px)), JR(sc(note_px))
    f_scan, f_sub, f_or, f_ph = JM(sc(scan_px)), JL(sc(sub_px)), JL(sc(or_px)), Q(sc(phone_px))
    f_pil, f_site = JR(sc(pil_px)), JM(sc(site_px))

    logo_gap = sc(12 if fmt == "45" else 18)
    marca_h = sc(logo_px) + logo_gap + sc(wm_px)

    diam = sc(avatar_px)
    col_gap = sc(30)
    col_w = W - sc(pad_x) * 2 - diam - col_gap
    tokens = [(w, WHITE) for w in "En 30 días sabes hacia dónde vas y".split()]
    tokens += [(w, GOLD) for w in "cómo llegar.".split()]
    h1_lines, h1_space = wrap_rich(d, tokens, f_h1, col_w)
    h1_lh = int(sc(h1_px) * 1.2)
    eb_gap = sc(18)
    txt_h = sc(eb_px) + eb_gap + h1_lh * len(h1_lines)
    role_gap = sc(12)
    hero_h = max(txt_h, diam + role_gap + sc(role_px))

    grid_gap = sc(16)
    ben_h = sc(card_h) * 2 + grid_gap

    price_h = sc(price_px) + sc(14) + sc(note_px)


    pie_gap = sc(22)
    pie_h = 1 + pie_gap + int(sc(pil_px) * 1.35) + sc(6) + int(sc(site_px) * 1.35)

    # ---------- repartir el aire ----------
    bloques = marca_h + hero_h + ben_h + price_h + pie_h
    sobra = H - sc(pad_top) - sc(pad_bot) - bloques - sum(sc(m) for m, _ in huecos.values())
    if sobra < 0:
        print(f"    ¡ojo! en {fmt} faltan {int(-sobra / S)} px")
        sobra = 0
    pt = sum(w for _, w in huecos.values())
    g = {k: sc(m) + sobra * w / pt for k, (m, w) in huecos.items()}

    # ---------- dibujar ----------
    y = sc(pad_top)
    logo = Image.open(PROJ / "public/logo-h.png").convert("RGBA").resize((sc(logo_px), sc(logo_px)), Image.LANCZOS)
    img.paste(logo, (cx - sc(logo_px) // 2, y), logo)
    draw_tracked(d, cx, y + sc(logo_px) + logo_gap, "HOLMAN GLOBAL GROUP LLC", f_wm, MUTED, sc(wm_px) * 0.38)
    y += marca_h + g["marca_hero"]

    # hero: texto a la izquierda, retrato a la derecha
    left_x = sc(pad_x)
    por = hero_portrait(diam)
    img.paste(por, (W - sc(pad_x) - diam + (diam - por.width) // 2,
                    int(y + (hero_h - diam - role_gap - sc(role_px)) / 2) - (por.height - diam) // 2), por)
    draw_tracked(d, W - sc(pad_x) - diam // 2,
                 int(y + (hero_h - diam - role_gap - sc(role_px)) / 2) + diam + role_gap,
                 "HOLMAN ORJUELA · COACH", f_role, MUTED, sc(role_px) * 0.28)
    ty = int(y + (hero_h - txt_h) / 2)
    draw_tracked(d, left_x, ty, "PROGRAMA FUNDADOR · 30 DÍAS", f_eb, GOLD, sc(eb_px) * 0.28, anchor="l")
    yy = ty + sc(eb_px) + eb_gap
    for line in h1_lines:
        x = left_x
        for word, color, w in line:
            d.text((x, yy), word, font=f_h1, fill=color)
            x += w + h1_space
        yy += h1_lh
    y += hero_h + g["hero_ben"]

    # beneficios: 2x2 tarjetas
    gx = sc(pad_x)
    cw = (W - sc(pad_x) * 2 - grid_gap) // 2
    ch = sc(card_h)
    for i, (t, s) in enumerate(BENEFICIOS):
        x0 = gx + (i % 2) * (cw + grid_gap)
        y0 = int(y + (i // 2) * (ch + grid_gap))
        d.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], radius=sc(16), fill=SURF, outline=LINE, width=max(1, S))
        bar_h = sc(card_h * 0.42)
        d.rounded_rectangle([x0 + sc(22), y0 + (ch - bar_h) // 2, x0 + sc(22) + sc(3), y0 + (ch + bar_h) // 2],
                            radius=sc(2), fill=GOLD)
        tx = x0 + sc(42)
        block = sc(ben_t) + sc(10) + sc(ben_s)
        ty0 = y0 + (ch - block) // 2
        d.text((tx, ty0), t, font=f_bt, fill=WHITE)
        sub_lines, sp = wrap_rich(d, [(w, MUTED) for w in s.split()], f_bs, cw - sc(42) - sc(20))
        if len(sub_lines) > 1:  # dos líneas: subir el bloque
            ty0 -= int(sc(ben_s) * 0.7)
            d.rectangle([tx, ty0 - 2, x0 + cw - sc(4), ty0 + sc(ben_t)], fill=SURF)
            d.text((tx, ty0), t, font=f_bt, fill=WHITE)
        sy = ty0 + sc(ben_t) + sc(10)
        for line in sub_lines:
            x = tx
            for word, color, w in line:
                d.text((x, sy), word, font=f_bs, fill=color)
                x += w + sp
            sy += int(sc(ben_s) * 1.4)
    y += ben_h + g["ben_precio"]

    # precio
    p1, p2 = "100 USD", " / mes"
    pw = d.textlength(p1, font=f_price) + d.textlength(p2, font=f_per)
    px0 = cx - pw / 2
    d.text((px0, y), p1, font=f_price, fill=GOLD)
    d.text((px0 + d.textlength(p1, font=f_price), y + sc(price_px) - sc(per_px) * 1.15), p2, font=f_per, fill=MUTED)
    y += sc(price_px) + sc(14)
    draw_tracked(d, cx, y, "SOLO 7 CUPOS  ·  CIERRA EL MIÉRCOLES 21 DE OCTUBRE", f_note, WHITE, sc(note_px) * 0.2)
    y += sc(note_px) + g["precio_pie"]

    # pie
    d.line([(sc(pad_x), y), (W - sc(pad_x), y)], fill=(30, 36, 43), width=max(1, S // 2))
    y += 1 + pie_gap
    draw_tracked(d, cx, y, "SENTIDO · MARCA · SISTEMA", f_pil, DIM, sc(pil_px) * 0.36)
    y += int(sc(pil_px) * 1.35) + sc(6)
    draw_tracked(d, cx, y, "holmanglobalgroup.com", f_site, MUTED, sc(site_px) * 0.12)

    # salidas: sin QR ni número; se manda por chat directo a cada persona
    suffix = {"45": "vertical-4x5", "916": "story-9x16"}[fmt]
    img.resize((W1, H1), Image.LANCZOS).save(OUT / f"programa-fundador-{suffix}.png", optimize=True)
    print(f"  {suffix}: {W1}x{H1}  aire: " + "  ".join(f"{k} {int(v / S)}" for k, v in g.items()))


print("Generando flyers del Programa Fundador…")
build("45")
build("916")
