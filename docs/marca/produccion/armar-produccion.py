"""Cómo producimos una Marca con Huella: manual interno de Holman y Sol (nov 2026)."""
import re, pathlib

RAIZ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
fase1 = (RAIZ / "docs/propuestas/marisol-reparto/acuerdo-fase-1-sol.html").read_text()
css = re.search(r"<style>(.*?)</style>", fase1, re.S).group(1)
css = re.sub(r"/\* Acuerdo de la Fase 1.*?\*/", "", css, flags=re.S)
LOGO = "../../../public/marca/logo-h-claro.png"
CHECK = '<span class="check">✓</span>'
H = '<span class="quien h">Holman</span>'
S = '<span class="quien s">Sol</span>'
C = '<span class="quien c">Cliente</span>'


def li(t):
    return f"<li>{CHECK}<span>{t}</span></li>"


def ul(*xs):
    return "<ul>" + "".join(li(x) for x in xs) + "</ul>"


def top(num):
    return f'<div class="top"><div class="brand"><img src="{LOGO}" alt="">Marca con Huella · Producción</div><span class="num">{num}</span></div>'


def foot():
    return '<div class="foot"><span>Holman Global Group · Uso interno</span><span>Versión 1 · Noviembre 2026</span></div>'


def tramo(small, big, titulo, cuerpo, entrega=""):
    e = f'<p class="entrega"><b>Sale de aquí:</b> {entrega}</p>' if entrega else ""
    return f'''<div class="tramo">
      <div class="cuando"><small>{small}</small><b>{big}</b></div>
      <div><h3>{titulo}</h3>{cuerpo}{e}</div>
    </div>'''


EXTRA = """
  .quien.c { background: rgba(120,170,255,.14); color: #A9C6FF; }
  .tramo .entrega { margin-top: 6px; padding-top: 5px; border-top: 1px dashed var(--hair); font-size: 8.8pt; color: var(--muted); }
  .tramo .entrega b { color: var(--gold); font-weight: 600; }
  .flujo { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2.5mm; margin-top: 6mm; }
  .flujo div { padding: 4mm 3.5mm; border: 1px solid var(--hair); border-top: 2px solid var(--gold); border-radius: 0 0 12px 12px; background: var(--bg-2); }
  .flujo small { font-size: 7pt; letter-spacing: .16em; text-transform: uppercase; color: var(--gold); }
  .flujo b { display: block; margin: 4px 0 4px; font-family: 'Questrial'; font-weight: 400; font-size: 12pt; color: var(--white); }
  .flujo p { font-size: 8.4pt; line-height: 1.4; }
  .roles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.5mm; margin-top: 6mm; }
  .roles div { padding: 4.5mm; border: 1px solid var(--hair); border-radius: 14px; background: var(--bg-2); }
  .roles h3 { font-size: 13pt; margin: 6px 0 5px; }
  .roles ul { list-style: none; display: grid; gap: 4px; }
  .roles li { display: grid; grid-template-columns: 12px 1fr; gap: 6px; font-size: 8.9pt; line-height: 1.42; }
  .reglas { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; margin-top: 5mm; }
  .reglas div { padding: 4mm 4.5mm; border-left: 2px solid var(--gold); border-radius: 0 12px 12px 0; background: var(--bg-2); font-size: 9pt; line-height: 1.5; }
  .reglas strong { display: block; margin-bottom: 2px; }
  .check-tabla { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 9.2pt; }
  .check-tabla th, .check-tabla td { padding: 5.5px 8px; border-bottom: 1px solid var(--hair); text-align: center; }
  .check-tabla th { font-family: 'Questrial'; font-weight: 400; color: var(--white); }
  .check-tabla td:first-child, .check-tabla th:first-child { text-align: left; }
  .check-tabla td.s { color: var(--gold); }
  .check-tabla td.q { text-align: left; color: var(--muted); font-size: 8.4pt; }
"""

p1 = f'''<section class="page">
  {top("01 · EL MAPA")}
  <p class="kicker">Manual de producción</p>
  <h2>Cómo producimos<br>una Marca con Huella.</h2>
  <p class="sub">El paso a paso para que cada marca salga igual de bien, sin importar quién la tome. Es para nosotros: Holman, Sol y quien se sume al equipo.</p>

  <div class="flujo">
    <div><small>Día 0</small><b>Arranque</b><p>Pago, bienvenida, accesos y agenda de las dos sesiones.</p></div>
    <div><small>Semana 1</small><b>Crear</b><p>Coaching y marca con Holman; estrategia de redes con Sol.</p></div>
    <div><small>Semana 2</small><b>Lanzar</b><p>Se publica, landing y embudo listos, ventas a contactos.</p></div>
    <div><small>Semanas 3–5</small><b>Casa digital</b><p>Web, regalo y correos (Pro); tienda (Elite).</p></div>
    <div><small>Meses 2 y 3</small><b>Crecer</b><p>Contenido, revisión, ajustes y cierre con plan de 90 días.</p></div>
  </div>

  <div class="roles">
    <div><span class="quien h">Holman</span><h3>Marca y negocio</h3><ul>
      {li("Coaching de marca")}
      {li("Manual de marca, oferta y precio")}
      {li("Landing, embudo, web y tienda")}
      {li("Regalo y correos automáticos")}
      {li("Plan financiero (Elite)")}
      {li("Cobro y relación con el cliente")}
    </ul></div>
    <div><span class="quien s">Sol</span><h3>Redes</h3><ul>
      {li("Estrategia de redes de cada marca")}
      {li("Calendario y piezas de cada mes, con Claude")}
      {li("Publicar 3, 5 o 7 veces por semana")}
      {li("Decidir si la estrategia lleva historias")}
      {li("Informe corto de redes cada mes")}
    </ul></div>
    <div><span class="quien c">Cliente</span><h3>Su parte</h3><ul>
      {li("Asistir a las sesiones")}
      {li("Dar accesos a sus redes")}
      {li("Enviar fotos y videos cada semana")}
      {li("Aprobar a tiempo lo que le mostramos")}
      {li("Escribirle a sus contactos")}
    </ul></div>
  </div>

  <div class="reglas">
    <div><strong>Un solo grupo de WhatsApp por marca</strong>Holman, Sol y el cliente. Ahí van las aprobaciones, los avisos y las dudas.</div>
    <div><strong>Todo el avance, en «Mi proceso»</strong>El cliente ve su meta, sus compromisos y el acta de cada sesión en su panel de ECOS.</div>
  </div>
  {foot()}
</section>'''

p2 = f'''<section class="page">
  {top("02 · DEL DÍA 0 A LA SEMANA 5")}
  <div class="crono" style="margin-top:0">
    {tramo("Día", "0", "Arranque: el día que paga", ul(
        f"{H} Mensaje de bienvenida y creación del grupo de WhatsApp con Sol y el cliente.",
        f"{H} Crear su programa en la Torre → Clientes; con eso entra a ECOS y ve «Mi proceso».",
        f"{H} Agendar la sesión de coaching de marca y {S} la sesión de estrategia de redes, las dos en la semana 1.",
        f"{C} Enviar el formulario de arranque: accesos a sus redes, logo actual si tiene, fotos y videos, referentes que le gustan y su lista de contactos.",
    ), "cliente con todo listo para empezar el lunes.")}
    {tramo("Semana", "1", "Crear la marca", ul(
        f"{H} <strong>Sesión de coaching de marca</strong> (unos 90 min): su historia, su propósito, a quién le habla, su mensaje, su oferta, su precio y la estructura del negocio.",
        f"{H} Con lo de la sesión, crea el <strong>manual de marca</strong>: logo, paleta de colores, tipografías y tono de voz; y deja escrita la oferta con su precio.",
        f"{H} Presenta el manual y la oferta al cliente a mitad de semana. {C} los aprueba o pide ajustes.",
        f"{S} <strong>Sesión de estrategia de redes</strong> (unos 60 min): tono, temas, formatos, si lleva historias y el calendario del primer mes.",
        f"{S} En cuanto el manual está aprobado, prepara las piezas de la semana 2 con la marca nueva.",
    ), "manual de marca, oferta con precio y estrategia de redes, aprobados.")}
    {tramo("Semana", "2", "Lanzar", ul(
        f"{S} <strong>Empieza a publicar</strong>: 3, 5 o 7 piezas por semana según el paquete. Programa el mes completo con Claude y Meta Business Suite.",
        f"{H} Landing con la oferta y su botón de pago, y el <strong>embudo a WhatsApp</strong> (mensaje de bienvenida, preguntas para filtrar y enlace de pago).",
        f"{H} Prepara el <strong>lanzamiento a los contactos</strong>: lista de contactos calientes y mensajes listos para enviar.",
        f"{C} Envía los mensajes a sus contactos y atiende a los interesados con su guion.",
    ), "marca publicando, landing en línea y primeras conversaciones de venta.")}
    {tramo("Semanas", "3 a 5", "Casa digital", ul(
        f"{H} <span class='nivel'>Pro y Elite:</span> sitio web completo con su dominio.",
        f"{H} <span class='nivel'>Pro y Elite:</span> el regalo descargable que capta contactos y la secuencia de correos automáticos.",
        f"{H} <span class='nivel'>Elite:</span> tienda en línea con pasarela de pago internacional.",
        f"{S} Sigue el contenido de cada semana y empieza a mover el regalo en redes (Pro y Elite).",
        f"{C} Revisa y aprueba la web y la tienda.",
    ), "web, regalo, correos y tienda funcionando, según el paquete.")}
  </div>
  {foot()}
</section>'''

p4 = f'''<section class="page">
  {top("03 · MESES 2 Y 3 Y REGLAS")}
  <div class="crono" style="margin-top:0">
    {tramo("Mes", "2", "Atraer", ul(
        f"{S} Contenido cada semana y un <strong>informe corto de redes</strong> al final del mes: alcance, mensajes y las piezas que mejor funcionaron.",
        f"{H} <strong>Sesión de revisión</strong>: ventas frente a la meta; se ajusta la oferta, el mensaje o el precio si hace falta.",
        f"{H} <span class='nivel'>Elite:</span> plan financiero con la meta convertida en ventas por semana.",
    ))}
    {tramo("Mes", "3", "Crecer y cerrar", ul(
        f"{S} Repite los formatos que funcionaron y hace contenido con los <strong>testimonios</strong> de los primeros clientes.",
        f"{H} <strong>Sesión de cierre</strong>: resultados, entrega de la carpeta con todos los archivos y accesos, y el plan para los próximos 90 días.",
        f"{H} Ofrece cómo seguir: redes mensuales con Sol (85 % Sol, 15 % HGG) u otro programa de HGG.",
    ), "cliente con su marca andando, sus archivos y su siguiente paso.")}
  </div>

  <p class="kicker" style="margin-top:6mm">Reglas para que todo fluya</p>
  <div class="reglas">
    <div><strong>Aprobaciones en 48 horas</strong>Si el cliente no responde, seguimos con lo propuesto para no frenar el calendario.</div>
    <div><strong>Dos rondas de cambios</strong>Cada pieza (manual, landing, web) tiene hasta dos rondas de ajustes incluidas.</div>
    <div><strong>Material de cada semana</strong>Si el cliente no envía fotos o videos, Sol usa diseño o material de apoyo para no dejar de publicar.</div>
    <div><strong>La garantía depende de las tareas</strong>Si el cliente cumple su parte y al día 30 la oferta no está lista o la landing no está publicada, seguimos un mes más sin costo.</div>
  </div>

  <table class="check-tabla">
    <tr><th>Lo que se entrega</th><th>Starter</th><th>Pro</th><th>Elite</th><th style="text-align:left">Cuándo</th></tr>
    <tr><td>Manual de marca, oferta y precio</td><td class="s">✓</td><td class="s">✓</td><td class="s">✓</td><td class="q">Semana 1</td></tr>
    <tr><td>Estrategia de redes y publicaciones</td><td class="s">3/sem</td><td class="s">5/sem</td><td class="s">7/sem</td><td class="q">Semana 1 y desde la 2</td></tr>
    <tr><td>Landing y embudo a WhatsApp</td><td class="s">✓</td><td class="s">✓</td><td class="s">✓</td><td class="q">Semana 2</td></tr>
    <tr><td>Sitio web, regalo y correos</td><td>—</td><td class="s">✓</td><td class="s">✓</td><td class="q">Semanas 3 a 5</td></tr>
    <tr><td>Tienda con pago internacional</td><td>—</td><td>—</td><td class="s">✓</td><td class="q">Semanas 3 a 5</td></tr>
    <tr><td>Plan financiero</td><td>—</td><td>—</td><td class="s">✓</td><td class="q">Mes 2</td></tr>
  </table>
  {foot()}
</section>'''

html = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Marca con Huella: producción · Holman Global Group</title>
<link href="https://fonts.googleapis.com/css2?family=Questrial&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">
<style>
  /* Manual interno de producción de Marca con Huella (Holman + Sol, nov 2026). */{css}{EXTRA}
</style>
</head>
<body>
{p1}

{p2}

{p4}
</body>
</html>
'''
d = RAIZ / "docs/marca/produccion"
d.mkdir(parents=True, exist_ok=True)
(d / "produccion-marca-con-huella.html").write_text(html)
print("ok")
