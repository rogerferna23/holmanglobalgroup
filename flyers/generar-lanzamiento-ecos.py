# -*- coding: utf-8 -*-
"""Flyer del gran lanzamiento de ECOS: «Hoy empezamos» + clase de regalo.

Pieza de un solo día para mandar por WhatsApp junto al mensaje personal. El
llamado es «escríbeme»: no lleva QR ni enlace, la conversación la abre quien
lo recibe. Mismo sistema que generar-publicidad-ecos.py, del que toma fondo,
placa y ecos.

    ./.venv/bin/python flyers/generar-lanzamiento-ecos.py

Salida en flyers/publicidad-ecos/lanzamiento/ (4x5 para chats y grupos,
9x16 para estados e historias).
"""
import importlib.util
import pathlib

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("pub", HERE / "generar-publicidad-ecos.py")
pub = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pub)
fe = pub.fe

pub.S = 3  # se ve en pantallas grandes: un poco más de resolución
p = pub.p
GOLD, WHITE, MUTED, DIM = pub.GOLD, pub.WHITE, pub.MUTED, pub.DIM
Q, JL, JR, JM = pub.Q, pub.JL, pub.JR, pub.JM

# ── Lo que cambia de una edición a otra ─────────────────────────────────────
# La hora sale de ecos_sessions (la misma que ven el panel y los correos).
MES, DIA, SEMANA = "OCT", "06", "MARTES"
CLASE = "Oratoria"
PROFE = "con Holman Orjuela"
HORAS = ["8:00 pm hora del Este", "7:00 pm Colombia"]


FORMATOS = {
    # El 9x16 deja libres ~250 px arriba y ~300 abajo (interfaz de historias).
    "4x5": dict(H=1350, k=1.0, top=0, bottom=0),
    "9x16": dict(H=1920, k=1.1, top=210, bottom=250),
}


def lanzamiento(fmt):
    F = FORMATOS[fmt]
    k = F["k"]
    q = lambda v: p(v * k)
    W, H = p(1080), p(F["H"])
    img = pub.fondo(W, H, [(0.5, 0.05, 0.9, 0.42, 0.22), (0.5, 1.1, 0.7, 0.3, 0.09)])
    cx = W / 2

    # Todo el contenido en una capa que al final se centra en alto.
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    y = q(110)

    placa, paso = q(112), q(14)
    capa.alpha_composite(pub.ecos_placa(W, H, cx, y + placa / 2, placa, 3, paso))
    pub.pegar_centro(capa, fe.marca(placa).convert("RGBA"), cx, y)
    y += placa + 3 * paso + q(12)
    fe.tracked(d, cx, y, "BUSINESS CLUB", JL(q(17)), GOLD, q(7))
    y += q(78)

    # Eyebrow con filetes a los lados
    f_e = JM(q(24))
    t = "GRAN LANZAMIENTO"
    tw = fe.track_w(d, t, f_e, q(8))
    fe.tracked(d, cx, y, t, f_e, GOLD, q(8))
    yl = y + q(11)
    for s in (-1, 1):
        x0 = cx + s * (tw / 2 + q(26))
        d.line([(x0, yl), (x0 + s * q(70), yl)], fill=(240, 184, 0, 150), width=max(1, q(1.5)))
    y += q(62)

    pub.centrado(d, cx, y, "Hoy empezamos.", Q(q(104)), WHITE)
    y += q(132)
    y = pub.bloque(d, cx, y, "Ventas, marketing y oratoria, en vivo,\ncon la comunidad correcta.",
                   JL(q(30)), MUTED, p(900), q(42), centro=True)
    y += q(48)

    # Clase de hoy, como una entrada de agenda: la fecha a la izquierda, un
    # filete dorado y los datos a la derecha.
    f_mes, f_dia, f_sem = JM(q(22)), Q(q(118)), JL(q(20))
    f_ey, f_cl, f_pr, f_h = JM(q(19)), Q(q(56)), JL(q(28)), JR(q(23))
    w_izq = max(d.textlength(DIA, font=f_dia), fe.track_w(d, MES, f_mes, q(6)),
                fe.track_w(d, SEMANA, f_sem, q(5)))
    w_der = max(fe.track_w(d, "PRIMERA CLASE", f_ey, q(5)), d.textlength(CLASE, font=f_cl),
                d.textlength(PROFE, font=f_pr), *(d.textlength(h, font=f_h) for h in HORAS))
    gap = q(48)
    x0 = cx - (w_izq + gap * 2 + w_der) / 2
    alto = q(220)
    xi = x0 + w_izq / 2
    fe.tracked(d, xi, y + q(8), MES, f_mes, GOLD, q(6))
    pub.centrado(d, xi, y + q(52), DIA, f_dia, WHITE)
    fe.tracked(d, xi, y + q(186), SEMANA, f_sem, MUTED, q(5))
    xl = x0 + w_izq + gap
    d.line([(xl, y), (xl, y + alto)], fill=(240, 184, 0, 170), width=max(1, q(1.5)))
    xd = xl + gap
    pub.tracked_left(d, xd, y + q(4), "PRIMERA CLASE", f_ey, GOLD, q(5))
    d.text((xd, y + q(34)), CLASE, font=f_cl, fill=WHITE)
    d.text((xd, y + q(106)), PROFE, font=f_pr, fill=MUTED)
    for i, h in enumerate(HORAS):
        d.text((xd, y + q(154) + i * q(34)), h, font=f_h, fill=WHITE if i == 0 else MUTED)
    y += alto + q(64)

    # Llamado a la acción en una tarjeta con borde dorado
    bw, bh = p(860 * min(k, 1.0)) if fmt == "4x5" else p(900), q(196)
    bx = int(cx - bw / 2)
    d.rounded_rectangle([bx, y, bx + bw, y + bh], radius=q(26),
                        fill=(240, 184, 0, 18), outline=(240, 184, 0, 190), width=max(1, q(1.6)))
    pub.centrado(d, cx, y + q(36), "¿Quieres vivir la clase de hoy", Q(q(38)), WHITE)
    pub.centrado(d, cx, y + q(82), "de regalo?", Q(q(38)), WHITE)
    pub.centrado(d, cx, y + q(140), "Escríbeme y te reservo tu lugar.", JR(q(27)), GOLD)
    y += bh + q(54)

    # Firma
    logo = Image.open(HERE.parent / "public/logo-h.png").convert("RGBA")
    lw = q(26)
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    f_f = JL(q(16))
    t = "UN CLUB DE HOLMAN GLOBAL GROUP"
    tw = fe.track_w(d, t, f_f, q(4))
    xl = int(cx - (lw + q(12) + tw) / 2)
    capa.alpha_composite(logo, (xl, int(y + q(9) - logo.height / 2)))
    pub.tracked_left(d, xl + lw + q(12), y, t, f_f, DIM, q(4))
    y += q(30)

    bb = capa.getbbox()
    top, bot = p(F["top"]), H - p(F["bottom"])
    dy = int((top + bot) / 2 - (bb[1] + bb[3]) / 2)
    img.alpha_composite(capa, (0, dy))
    pub.guardar(img, pub.OUT / "lanzamiento", f"ecos-lanzamiento-hoy-{fmt}", 1080, F["H"])


if __name__ == "__main__":
    for f in FORMATOS:
        lanzamiento(f)
