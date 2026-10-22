#!/bin/zsh
# Mockups de Marca con Huella (marca de ejemplo «Olivo») para la vitrina de
# /tienda. Fotografía cada escena de marca-olivo.html con Chrome headless
# (fondo transparente), recorta el borde vacío y guarda WebP en public/tienda.
# Uso: zsh scripts/mockups/render-marca.sh   (necesita Google Chrome y Pillow)
D="${0:A:h}"
OUT="$D/../../public/tienda"
TMP="$(mktemp -d)"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
render() { # escena ancho alto
  "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --virtual-time-budget=8000 \
    --window-size=$2,$3 --screenshot="$TMP/$1.png" "file://$D/marca-olivo.html#$1" 2>/dev/null
}
render hero 2200 1500
render starter 1600 1100
render pro 1600 1100
render elite 1600 1100
python3 - "$TMP" "$OUT" <<'PY'
import sys
from PIL import Image
tmp, out = sys.argv[1:]
anchos = {"hero": 1600, "starter": 900, "pro": 900, "elite": 900}
for n, ancho in anchos.items():
    im = Image.open(f"{tmp}/{n}.png").convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())
    im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    im.save(f"{out}/marca-{n}.webp", quality=86, method=6)
    print(f"marca-{n}.webp", im.size)
PY
rm -rf "$TMP"
