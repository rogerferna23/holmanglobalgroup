# Flyers del club

Tres formatos del mismo diseño, con la paleta y las tipografías de HGG.

| Archivo | Para qué |
|---|---|
| `ecos-club-vertical-4x5.png` (1080×1350) | Feed de Instagram y Facebook, grupos de WhatsApp |
| `ecos-club-cuadrado-1x1.png` (1080×1080) | Publicaciones cuadradas |
| `ecos-club-story-9x16.png` (1080×1920) | Estados de WhatsApp, stories |
| `…@2x.png` | El doble de resolución, para impresión |

Están en la carpeta `flyers/`.

El QR lleva a **holmanglobalgroup.com/ecos**. A diferencia del de la Sesión de
Claridad, este no va a WhatsApp: quien escanea cae en la página de venta, que ya
explica todo y tiene el contador de lugares. Menos fricción y no te llena el
teléfono de preguntas que la página ya responde.

## Regenerar

Si cambia el precio, el gancho o el texto, se edita el script y se vuelve a
correr. No hace falta abrir ningún programa de diseño:

```bash
./.venv/bin/python flyers/generar-flyer-ecos.py
```

Lo que se toca más seguido está arriba del archivo `flyers/generar-flyer-ecos.py`:
la lista `MATERIAS`, la `URL`, y dentro de `build()` el precio y la línea de
«Octubre gratis para los primeros 50».

**Cuando se acabe el cupo fundador**, cambia esa línea por algo como
«Cancelas cuando quieras» y vuelve a generar. Un flyer que promete un cupo que
ya no existe hace más daño que no tener flyer.
