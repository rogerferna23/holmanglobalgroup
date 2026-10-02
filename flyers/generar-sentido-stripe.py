#!/usr/bin/env python3
"""
Imagen del Programa Sentido para Stripe (producto y enlaces de pago).

Misma placa de oro que la portada de ECOS Podcast, con la S de Sentido.
Sale en dos versiones cuadradas de 1200 px (Stripe pide menos de 2 MB):
  - sentido-stripe.jpg       placa + «SENTIDO» debajo (la recomendada)
  - sentido-stripe-icono.jpg solo la placa, para cuando se ve muy pequeña

    redes/.venv/bin/python flyers/generar-sentido-stripe.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "redes" / "podcast"))
import plantilla_podcast as P  # noqa: E402
import portada_podcast as PP  # noqa: E402

N = PP.N
SALIDA = RAIZ / "flyers" / "sentido-stripe"
FINAL = 1200


def componer(lado: int, cy: int, con_texto: bool) -> Image.Image:
    lienzo = PP.fondo()
    p = PP.placa("S", tam=int(PP.PLACA * 0.62), tracking=0).resize((lado, lado), Image.LANCZOS)
    x0, y0 = (N - lado) // 2, cy - lado // 2

    # Reflejo tenue en el piso y sombra, como en la portada del podcast
    refl = p.transpose(Image.FLIP_TOP_BOTTOM)
    alto = int(lado * 0.3)
    g = np.zeros((lado, lado), np.float32)
    g[:alto] = np.linspace(0.16, 0, alto)[:, None]
    refl.putalpha(Image.fromarray((np.asarray(refl.getchannel("A"), np.float32) * g).astype(np.uint8)))
    lienzo.alpha_composite(refl.filter(ImageFilter.GaussianBlur(3)), (x0, y0 + lado + 14))
    sombra = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    r = int(PP.RADIO * lado / PP.PLACA)
    ImageDraw.Draw(sombra).rounded_rectangle((x0 + 30, y0 + 70, x0 + lado - 30, y0 + lado + 60), r, fill=(0, 0, 0, 190))
    lienzo = Image.alpha_composite(lienzo, sombra.filter(ImageFilter.GaussianBlur(70)))
    lienzo.alpha_composite(p, (x0, y0))

    if con_texto:
        d = ImageDraw.Draw(lienzo)
        PP.centrado(d, 250, "HOLMAN GLOBAL GROUP", P.fuente("JosefinSans-Regular.ttf", 72), P.TENUE, 24)
        d.line((N // 2 - 70, 385, N // 2 + 70, 385), fill=(*P.ORO, 200), width=4)
        PP.centrado(d, y0 + lado + 250, "SENTIDO", P.fuente("JosefinSans-Light.ttf", 230), P.ORO, 110)
    return lienzo.convert("RGB").resize((FINAL, FINAL), Image.LANCZOS)


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    componer(1600, 1320, True).save(SALIDA / "sentido-stripe.jpg", quality=92, optimize=True)
    componer(2000, N // 2 - 60, False).save(SALIDA / "sentido-stripe-icono.jpg", quality=92, optimize=True)
    print(SALIDA)


if __name__ == "__main__":
    main()
