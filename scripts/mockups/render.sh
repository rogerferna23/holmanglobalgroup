#!/bin/zsh
# Mockups de las vitrinas de /tienda. Fotografía cada escena de <línea>.html
# con Chrome headless (fondo transparente), recorta el borde vacío y guarda
# WebP en public/tienda/<línea>-<escena>.webp.
# Uso: zsh scripts/mockups/render.sh marca|sentido|delegawork|entrada|og-tienda   (necesita Chrome y Pillow)
set -e
LINEA="${1:?Uso: render.sh <línea>}"
D="${0:A:h}"
# og-tienda: la imagen para compartir /tienda (1200 × 630, fondo opaco, JPG).
if [[ $LINEA == og-tienda ]]; then
  TMP="$(mktemp -d)"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --allow-file-access-from-files --virtual-time-budget=8000 \
    --window-size=1200,630 --screenshot="$TMP/og.png" "file://$D/og-tienda.html" 2>/dev/null
  python3 -c "from PIL import Image; Image.open('$TMP/og.png').convert('RGB').save('$D/../../public/tienda/og.jpg', quality=88)"
  rm -rf "$TMP"; echo "tienda/og.jpg"; exit 0
fi
OUT="$D/../../public/tienda"
TMP="$(mktemp -d)"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
render() { # escena ancho alto
  "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --default-background-color=00000000 --virtual-time-budget=8000 \
    --window-size=$2,$3 --screenshot="$TMP/$1.png" "file://$D/$LINEA.html#$1" 2>/dev/null
}
# DelegaWork tiene cuatro planes (Básico antes de Starter).
NIVELES=(starter pro elite)
[[ $LINEA == delegawork ]] && NIVELES=(basico starter pro elite)
# entrada.html: las tarjetas de Claridad, ECOS, el anual y el diagnóstico (sin vitrina).
HERO=1
[[ $LINEA == entrada ]] && NIVELES=(claridad ecos anual diagnostico) && HERO=0
(( HERO )) && render hero 2200 1500
for n in $NIVELES; do render $n 1600 1100; done
python3 - "$TMP" "$OUT" "$LINEA" $NIVELES <<'PY'
import os, sys
from PIL import Image
tmp, out, linea, *niveles = sys.argv[1:]
def recortar(n):
    im = Image.open(f"{tmp}/{n}.png").convert("RGBA")
    return im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())

if os.path.exists(f"{tmp}/hero.png"):
    im = recortar("hero")
    im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    im.save(f"{out}/{linea}-hero.webp", quality=86, method=6)
    print(f"{linea}-hero.webp", im.size)
# Las imágenes de los planes van en un lienzo igual (900 × 600, 3:2) para que
# todas se vean del mismo tamaño en las tarjetas de la tienda.
for n in niveles:
    im = recortar(n)
    escala = min(880 / im.width, 584 / im.height)
    im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    lienzo = Image.new("RGBA", (900, 600), (0, 0, 0, 0))
    lienzo.alpha_composite(im, ((900 - im.width) // 2, (600 - im.height) // 2))
    lienzo.save(f"{out}/{linea}-{n}.webp", quality=86, method=6)
    print(f"{linea}-{n}.webp", im.size, "en 900x600")
PY
rm -rf "$TMP"
