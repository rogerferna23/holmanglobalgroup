# Publicidad de ECOS · lanzamiento

Piezas que anuncian el club **sin precio**: el precio vive en la página.
Todo sale de `flyers/generar-publicidad-ecos.py`; los PNG `@2x` son para
pantallas grandes o impresión.

## Flyer de siempre (1080×1350) — `flyer/`

`ecos-business-club-4x5.png`. Presenta el club en una frase y sirve en
cualquier momento: no lleva fecha, precio ni cupo. Los contornos que rodean la
placa, con su misma forma, son los «ecos» del nombre. Para regenerar solo este:

```bash
./.venv/bin/python flyers/generar-publicidad-ecos.py --flyer
```

## Carrusel (1080×1350) — `carrusel/`

| # | Lámina |
|---|---|
| 01 | Portada: las habilidades que tu negocio necesita |
| 02 | Para ti: tienes algo valioso que dar |
| 03 | Tres materias, una habilidad: comunicar |
| 04 | Cómo es un mes: martes se aprende, viernes se practica |
| 05 | Lo que vas a lograr |
| 06 | Y además: comunidad, avance, embajador, sin permanencia |
| 07 | 20 lugares fundadores · QR a la página |

**Texto para acompañarlo (Instagram / Facebook):**

> Tienes algo valioso que dar. Ahora toca decirlo con claridad, llevar la
> conversación hasta el sí y hablar frente a la gente con seguridad.
>
> Para eso nace ECOS Business Club: ventas, marketing y oratoria, en vivo cada
> semana. Los martes se aprende, los viernes se practica.
>
> Abrimos el 1 de octubre con 20 lugares fundadores, y para ellos octubre va de
> regalo. 👉 holmanglobalgroup.com/ecos (link en la bio)
>
> #emprendedoreslatinos #ventas #oratoria #marketing #marcapersonal

## Cuenta regresiva (1080×1920) — `cuenta-regresiva/`

| Día | Pieza |
|---|---|
| Mié 24 sep | `07-faltan-7-dias` |
| Vie 26 sep | `05-faltan-5-dias` |
| Dom 28 sep | `03-faltan-3-dias` |
| Lun 29 sep | `02-faltan-2-dias` |
| Mar 30 sep | `01-falta-1-dia` |
| Mié 1 oct | `00-hoy-abrimos` |

En cada historia, pon el **sticker de enlace** a holmanglobalgroup.com/ecos
sobre la franja vacía de abajo; ese espacio queda libre a propósito.

## «Quedan N lugares»

Úsala **solo con el número real** del contador de la página:

```bash
./.venv/bin/python flyers/generar-publicidad-ecos.py --quedan 12
```

Cuando se llenen los 20, deja de usar esta pieza y la línea «octubre de regalo».

## Flyer en los tres formatos y fondo de Zoom

`--flyer` genera ahora el flyer en **4x5**, **9x16** (historias) y **1x1**
(cuadrado), a 4x de resolución, con su `-alta.jpg` para compartir.

`zoom/fondo-zoom-ecos.png` (1920×1080) es el fondo virtual para las clases.
En Zoom: Configuración → Fondos y efectos → **+** → Añadir imagen. Se regenera
con `--zoom`.
