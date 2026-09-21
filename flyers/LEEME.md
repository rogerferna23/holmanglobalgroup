# Flyer · Sesión de Claridad

Piezas generadas con la paleta y tipografías de HGG (fondo `#0B1016`, dorado
`#F0B800`, Questrial + Josefin Sans). La foto de Holman en círculo encabeza
la pieza y el logo de la H firma en el pie.

| Archivo | Uso |
|---|---|
| `flyer-sesion-claridad-vertical-4x5.png` (1080×1350) | Grupos de WhatsApp, feed de Instagram/Facebook |
| `flyer-sesion-claridad-cuadrado-1x1.png` (1080×1080) | Publicaciones cuadradas, Marketplace |
| `flyer-sesion-claridad-story-9x16.png` (1080×1920) | Estados de WhatsApp, stories de Instagram y Facebook |
| `…@2x.png` (2160×…) | Impresión o pantallas grandes |
| `qr-sofia.png` | El QR suelto, por si se necesita en otra pieza |

El QR apunta a `wa.me/12099641747` con el texto prellenado
**"Hola, quiero mi Sesión de Claridad"**, para que Sofía identifique de entrada
qué quiere la persona.

Usa corrección de error **M** a propósito: con el QR en tamaño pequeño, bajar de
45 a 37 módulos agranda cada módulo y el código sigue leyéndose aunque la imagen
se muestre reducida (verificado hasta ~600 px de ancho).

## Regenerar

```bash
python3 -m venv .venv && ./.venv/bin/pip install segno pillow numpy
./.venv/bin/python flyers/generar-flyer.py
```

Para cambiar el copy, el número o el texto del QR, editar las constantes al
inicio de `generar-flyer.py` (`WA_TEXT`, el titular en `build()`).
Las fuentes se leen de `~/Library/Fonts`.
