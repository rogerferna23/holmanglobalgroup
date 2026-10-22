#!/bin/zsh
# Mockups de las vitrinas de /tienda. Fotografía cada escena de <línea>.html
# con Chrome headless (fondo transparente), recorta el borde vacío y guarda
# WebP en public/tienda/<línea>-<escena>.webp.
# Uso: zsh scripts/mockups/render.sh marca|sentido|delegawork   (necesita Chrome y Pillow)
set -e
LINEA="${1:?Uso: render.sh <línea>}"
D="${0:A:h}"
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
render hero 2200 1500
for n in $NIVELES; do render $n 1600 1100; done
python3 - "$TMP" "$OUT" "$LINEA" $NIVELES <<'PY'
import sys
from PIL import Image
tmp, out, linea, *niveles = sys.argv[1:]
anchos = {"hero": 1600, **{n: 900 for n in niveles}}
for n, ancho in anchos.items():
    im = Image.open(f"{tmp}/{n}.png").convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())
    im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    im.save(f"{out}/{linea}-{n}.webp", quality=86, method=6)
    print(f"{linea}-{n}.webp", im.size)
PY
rm -rf "$TMP"
