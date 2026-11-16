#!/usr/bin/env python3
"""
Generador de las hojas de guion de ECOS Podcast.

Produce un PDF con el sistema visual de la marca (`marca_hgg.py`): una portada
con la preparación de la grabación y una hoja por episodio, con quién pregunta
en cada bloque.

Uso:
    python3 generar_guion_podcast.py datos/guion-podcast-2026-10-09.json [--salida DIR]

Genera el PDF y el Word (para compartirlo con Ingrid y que pueda editarlo).
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from marca_hgg import (
    BLANCO, MARGEN_X, MARGEN_Y, ORO, RAIZ, TENUE, TENUE_2,
    FUENTE_CUERPO, FUENTE_TITULO, _anchos_fijos, _bordes, _cierre, _fondo, _fondo_docx,
    _regla, _regla_docx, _run, cabecera_docx, cabecera_pdf, escapar, eyebrow,
    registrar_fuentes, slug,
)


def generar_pdf(datos: dict, destino: Path) -> Path:
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import (
        BaseDocTemplate, CondPageBreak, Frame, KeepTogether, PageBreak,
        PageTemplate, Paragraph, Spacer, Table, TableStyle,
    )

    registrar_fuentes()
    ancho_util = letter[0] - 2 * MARGEN_X

    def estilo(nombre, **kw):
        base = dict(fontName="Josefin", fontSize=10, leading=13.5,
                    textColor=HexColor(TENUE))
        base.update(kw)
        return ParagraphStyle(nombre, **base)

    est_eyebrow = estilo("eyebrow", fontName="Josefin-Medium", fontSize=8.5,
                         leading=12, textColor=HexColor(ORO))
    est_titulo = estilo("titulo", fontName="Questrial", fontSize=22, leading=26,
                        textColor=HexColor(BLANCO))
    est_entrada = estilo("entrada", fontName="Josefin-Light", fontSize=11,
                         leading=15)
    est_seccion = estilo("seccion", fontName="Questrial", fontSize=15, leading=20,
                         textColor=HexColor(BLANCO))
    est_bloque = estilo("bloque", fontName="Questrial", fontSize=12, leading=15,
                        textColor=HexColor(BLANCO))
    est_quien = estilo("quien", fontName="Josefin-SemiBold", fontSize=9.5,
                       leading=13.5, textColor=HexColor(BLANCO))
    est_texto = estilo("texto")
    est_nota = estilo("nota", fontName="Josefin-Light", fontSize=10, leading=14,
                      textColor=HexColor(TENUE_2))

    def texto(t: str, est=est_texto):
        return Paragraph(escapar(t), est)

    def tabla(filas, proporcion=0.17):
        t = Table(filas, colWidths=[ancho_util * proporcion,
                                    ancho_util * (1 - proporcion)])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (0, -1), 10),
            ("RIGHTPADDING", (1, 0), (1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        return t

    def cuerpo():
        prep = datos["preparacion"]
        h = cabecera_pdf(ancho_util) + [
            Spacer(1, 26),
            Paragraph(eyebrow(datos["eyebrow"]), est_eyebrow),
            Spacer(1, 6),
            texto(datos["titulo"], est_titulo),
            Spacer(1, 10),
            texto(datos["entrada"], est_entrada),
            Spacer(1, 18),
        ]
        # Índice corto: qué episodio sale cuándo.
        h.append(tabla([[texto(e["numero"], est_quien),
                         texto(f"{e['titulo']} · {e['sale']}")]
                        for e in datos["episodios"]], 0.17))
        h += [Spacer(1, 14), _regla(ancho_util, 0, 16),
              texto(prep["titulo"], est_seccion), Spacer(1, 4),
              texto(prep["nota"], est_nota), Spacer(1, 10)]
        h.append(tabla([[texto("—", est_nota), texto(i)] for i in prep["items"]],
                       0.05))
        h += [Spacer(1, 8), texto(prep["orden"], est_nota)]

        for ep in datos["episodios"]:
            h += [PageBreak(),
                  Paragraph(eyebrow(f"{ep['numero']} · {ep['sale']}"), est_eyebrow),
                  Spacer(1, 4), texto(ep["titulo"], est_titulo), Spacer(1, 6),
                  texto(ep["intro"], est_entrada), Spacer(1, 6),
                  _regla(ancho_util, 0, 10)]
            for b in ep["bloques"]:
                cab = Paragraph(
                    f"{escapar(b['titulo'])}"
                    f"<font name='Josefin-Light' size='9.5' color='{TENUE_2}'>"
                    f"  ·  {escapar(b['tiempo'])}</font>", est_bloque)
                filas = tabla([[texto(q, est_quien), texto(t)] for q, t in b["items"]])
                h.append(KeepTogether([cab, Spacer(1, 4), filas, Spacer(1, 6)]))
            h += [CondPageBreak(40), Spacer(1, 2),
                  Paragraph(f"<font name='Josefin-SemiBold' color='{BLANCO}'>"
                            f"Frases para reel:</font> {escapar(ep['reel'])}",
                            est_nota)]
        return h

    def documento(alto_extra=0.0):
        doc = BaseDocTemplate(str(destino), pagesize=letter,
                              leftMargin=MARGEN_X, rightMargin=MARGEN_X,
                              topMargin=MARGEN_Y, bottomMargin=MARGEN_Y,
                              title=f"ECOS Podcast · {datos['titulo']}",
                              author="Holman Global Group")
        marco = Frame(MARGEN_X, MARGEN_Y, ancho_util,
                      letter[1] - 2 * MARGEN_Y, id="marco",
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        doc.addPageTemplates([PageTemplate(id="p", frames=[marco], onPage=_fondo)])
        return doc

    d = documento()
    d.build(cuerpo() + [_cierre({}, d.height)])
    return destino


def generar_docx(datos: dict, destino: Path) -> Path:
    """El mismo guion en Word, con el fondo y las fuentes de la marca."""
    from docx import Document
    from docx.enum.text import WD_BREAK
    from docx.shared import Inches, Pt

    doc = Document()
    _fondo_docx(doc)
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Inches(8.5), Inches(11)
    sec.left_margin = sec.right_margin = Pt(MARGEN_X)
    sec.top_margin = sec.bottom_margin = Pt(MARGEN_Y)
    normal = doc.styles["Normal"]
    normal.font.name = FUENTE_CUERPO
    normal.font.size = Pt(10)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.25
    ancho_util = 8.5 - 2 * (MARGEN_X / 72)

    def parrafo(antes=0, despues=6, junto=False):
        q = doc.add_paragraph()
        q.paragraph_format.space_before = Pt(antes)
        q.paragraph_format.space_after = Pt(despues)
        q.paragraph_format.keep_with_next = junto
        return q

    def tabla(filas, proporcion=0.17, quien_fuerte=True):
        t = doc.add_table(rows=len(filas), cols=2)
        _bordes(t, None)
        _anchos_fijos(t, (proporcion, 1 - proporcion), ancho_util)
        for fila, (a, b) in zip(t.rows, filas):
            for i, valor in enumerate((a, b)):
                q = fila.cells[i].paragraphs[0]
                q.paragraph_format.space_after = Pt(3)
                if i == 0 and quien_fuerte:
                    _run(q, valor, tam=9.5, color=BLANCO, negrita=True)
                else:
                    _run(q, valor, tam=10, color=TENUE_2 if i == 0 else TENUE)
        return t

    def salto():
        parrafo(despues=0).add_run().add_break(WD_BREAK.PAGE)

    prep = datos["preparacion"]
    cabecera_docx(doc, ancho_util)
    _run(parrafo(antes=20, despues=3), eyebrow(datos["eyebrow"]), tam=8, color=ORO,
         negrita=True)
    _run(parrafo(despues=8), datos["titulo"], fuente=FUENTE_TITULO, tam=22, color=BLANCO)
    _run(parrafo(despues=14), datos["entrada"], tam=11, color=TENUE)
    tabla([(e["numero"], f"{e['titulo']} · {e['sale']}") for e in datos["episodios"]])
    _regla_docx(doc, ancho_util)
    _run(parrafo(antes=12, despues=2), prep["titulo"], fuente=FUENTE_TITULO, tam=15,
         color=BLANCO)
    _run(parrafo(despues=8), prep["nota"], tam=10, color=TENUE_2)
    tabla([("—", i) for i in prep["items"]], 0.05, quien_fuerte=False)
    _run(parrafo(antes=6), prep["orden"], tam=10, color=TENUE_2)

    for ep in datos["episodios"]:
        salto()
        _run(parrafo(despues=3), eyebrow(f"{ep['numero']} · {ep['sale']}"), tam=8,
             color=ORO, negrita=True)
        _run(parrafo(despues=6), ep["titulo"], fuente=FUENTE_TITULO, tam=22, color=BLANCO)
        _run(parrafo(despues=8), ep["intro"], tam=11, color=TENUE)
        _regla_docx(doc, ancho_util)
        for b in ep["bloques"]:
            q = parrafo(antes=10, despues=4, junto=True)
            _run(q, b["titulo"], fuente=FUENTE_TITULO, tam=12, color=BLANCO)
            _run(q, f"  ·  {b['tiempo']}", tam=9.5, color=TENUE_2)
            tabla([(quien, t) for quien, t in b["items"]])
        q = parrafo(antes=10)
        _run(q, "Frases para reel: ", tam=10, color=BLANCO, negrita=True)
        _run(q, ep["reel"], tam=10, color=TENUE_2)

    doc.core_properties.title = f"ECOS Podcast · {datos['titulo']}"
    doc.core_properties.author = "Holman Global Group"
    doc.save(str(destino))
    return destino


def generar_docx_imprimir(datos: dict, destino: Path) -> Path:
    """Versión para imprimir: fondo blanco, letra negra, Arial, sin logo."""
    from docx import Document
    from docx.enum.text import WD_BREAK
    from docx.shared import Inches, Pt, RGBColor

    negro, gris = RGBColor(0, 0, 0), RGBColor(0x55, 0x55, 0x55)
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Inches(8.5), Inches(11)
    sec.left_margin = sec.right_margin = sec.top_margin = sec.bottom_margin = Inches(0.9)
    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(11)
    normal.font.color.rgb = negro
    normal.paragraph_format.space_after = Pt(4)
    normal.paragraph_format.line_spacing = 1.2
    ancho_util = 8.5 - 2 * 0.9

    def texto(q, t, tam=11, negrita=False, color=negro):
        r = q.add_run(t)
        r.font.size, r.bold, r.font.color.rgb = Pt(tam), negrita, color
        return r

    def parrafo(antes=0, despues=4, junto=False):
        q = doc.add_paragraph()
        q.paragraph_format.space_before = Pt(antes)
        q.paragraph_format.space_after = Pt(despues)
        q.paragraph_format.keep_with_next = junto
        return q

    def tabla(filas, proporcion=0.16, quien_fuerte=True):
        t = doc.add_table(rows=len(filas), cols=2)
        _bordes(t, None)
        _anchos_fijos(t, (proporcion, 1 - proporcion), ancho_util)
        for fila, (a, b) in zip(t.rows, filas):
            for i, valor in enumerate((a, b)):
                q = fila.cells[i].paragraphs[0]
                q.paragraph_format.space_after = Pt(4)
                texto(q, valor, negrita=(i == 0 and quien_fuerte))

    prep = datos["preparacion"]
    texto(parrafo(despues=2), datos["eyebrow"].upper(), tam=9, negrita=True, color=gris)
    texto(parrafo(despues=8), datos["titulo"], tam=20, negrita=True)
    texto(parrafo(despues=10), datos["entrada"])
    tabla([(e["numero"], f"{e['titulo']} · {e['sale']}") for e in datos["episodios"]], 0.18)
    texto(parrafo(antes=14, despues=2), prep["titulo"], tam=14, negrita=True)
    texto(parrafo(despues=6), prep["nota"], color=gris)
    tabla([("—", i) for i in prep["items"]], 0.05, quien_fuerte=False)
    texto(parrafo(antes=6), prep["orden"], color=gris)

    for ep in datos["episodios"]:
        parrafo(despues=0).add_run().add_break(WD_BREAK.PAGE)
        texto(parrafo(despues=2), f"{ep['numero']} · {ep['sale']}".upper(), tam=9,
              negrita=True, color=gris)
        texto(parrafo(despues=6), ep["titulo"], tam=20, negrita=True)
        texto(parrafo(despues=6), ep["intro"])
        for b in ep["bloques"]:
            q = parrafo(antes=10, despues=3, junto=True)
            texto(q, b["titulo"], tam=13, negrita=True)
            texto(q, f"  ·  {b['tiempo']}", tam=10, color=gris)
            tabla([(quien, t) for quien, t in b["items"]])
        q = parrafo(antes=12)
        texto(q, "Frases para reel: ", negrita=True)
        texto(q, ep["reel"])

    doc.core_properties.title = f"ECOS Podcast · {datos['titulo']}"
    doc.core_properties.author = "Holman Global Group"
    doc.save(str(destino))
    return destino


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("datos", type=Path)
    p.add_argument("--salida", type=Path, default=RAIZ / "generadas")
    p.add_argument("--imprimir", action="store_true",
                   help="solo el Word en blanco y negro, para imprimir")
    a = p.parse_args()
    datos = json.loads(a.datos.read_text(encoding="utf-8"))
    a.salida.mkdir(parents=True, exist_ok=True)
    base = re.sub(r"_+", "_", f"ECOS_Podcast_{slug(datos['titulo'])}")
    if a.imprimir:
        print(generar_docx_imprimir(datos, a.salida / f"{base}_imprimir.docx"))
        return
    print(generar_pdf(datos, a.salida / f"{base}.pdf"))
    print(generar_docx(datos, a.salida / f"{base}.docx"))


if __name__ == "__main__":
    main()
