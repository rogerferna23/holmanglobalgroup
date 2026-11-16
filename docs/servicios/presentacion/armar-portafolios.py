"""Arma los portafolios de Sentido y de Servicios con el mismo estilo del de Marca con Huella."""
import re, pathlib

RAIZ = pathlib.Path("/Users/holmanorjuela/Documents/Claude/Holman Global Group LLC")
marca = (RAIZ / "docs/marca/presentacion/marca-con-huella.html").read_text()
css = re.search(r"<style>(.*?)</style>", marca, re.S).group(1)
css = re.sub(r"/\* Presentación de Marca con Huella.*?\*/", "", css, flags=re.S)

EXTRA = """
  /* Propio de Sentido y Servicios */
  .precio.uno { grid-template-columns: 1fr; }
  .m2h2 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 5mm; }
  .m2h2 div { padding: 4.5mm 4mm; border: 1px solid var(--hair); border-radius: 14px; background: var(--bg-2); }
  .m2h2 b { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--gold-line); border-radius: 50%; color: var(--gold); font-family: 'Questrial'; font-weight: 400; font-size: 13pt; }
  .m2h2 h4 { margin: 8px 0 5px; font-size: 13pt; }
  .m2h2 p { font-size: 8.8pt; line-height: 1.45; }
  .frases { display: grid; gap: 7px; margin-top: 8px; }
  .frases p { font-family: 'Questrial'; font-size: 10.5pt; color: var(--white); }
  .solo { margin-top: 5mm; }
  .servicios { display: grid; gap: 4mm; margin-top: 7mm; }
  .servicios.c3 { grid-template-columns: repeat(3, 1fr); }
  .servicios.c2 { grid-template-columns: repeat(2, 1fr); }
  .serv { display: flex; flex-direction: column; padding: 5mm; border: 1px solid var(--hair); border-radius: 16px; background: var(--bg-2); }
  .serv .kicker { font-size: 7.5pt; }
  .serv h3 { font-size: 16pt; margin: 6px 0 4px; }
  .serv .tag { font-size: 9pt; color: var(--muted); line-height: 1.45; }
  .serv ul { list-style: none; display: grid; gap: 6px; margin: 4mm 0; }
  .serv li { display: grid; grid-template-columns: 11px 1fr; gap: 6px; font-size: 8.8pt; line-height: 1.42; }
  .serv .precio { margin-top: auto; }
  .bloque-titulo { margin-top: 9mm; }
  .bloque-titulo h2 { font-size: 22pt; }
  .bloque-titulo .sub { margin-top: 4px; }
  .llc { display: grid; grid-template-columns: 1.25fr 1fr; gap: 6mm; margin-top: 7mm; align-items: stretch; }
  .llc .serv ul { margin-bottom: 0; }
  .ia { margin-top: 5mm; display: flex; justify-content: space-between; align-items: center; gap: 6mm; padding: 5mm 6mm; border: 1px solid var(--gold-line); border-radius: 16px; background: linear-gradient(120deg, rgba(240,184,0,.10), rgba(240,184,0,.02)); }
  .ia h3 { font-size: 15pt; }
  .ia p { font-size: 9.5pt; margin-top: 4px; }
  .ia .q { font-family: 'Questrial'; font-size: 12pt; color: var(--gold); white-space: nowrap; }
"""

LOGO = "../../../public/marca/logo-h-claro.png"
CHECK = '<span class="check">✓</span>'


def li(t):
    return f"<li>{CHECK}<span>{t}</span></li>"


def top(nombre, num):
    return f'<div class="top"><div class="brand"><img src="{LOGO}" alt="">{nombre}</div><span class="num">{num}</span></div>'


def foot(izq="Holman Global Group", der="holmanglobalgroup.com"):
    return f'<div class="foot"><span>{izq}</span><span>{der}</span></div>'


def precio2(n, cuota, contado, ahorro):
    return (f'<div class="precio solo-precio"><div><small>En {n} pagos</small><span class="m"><i>{n} ×</i> ${cuota}</span><span class="n">USD al mes</span></div>'
            f'<div><small>De contado</small><span class="m">${contado}</span><span class="n g">Ahorras ${ahorro}</span></div></div>')


def precio1(etiqueta, monto, nota):
    return f'<div class="precio uno solo-precio"><div><small>{etiqueta}</small><span class="m">{monto}</span><span class="n">{nota}</span></div></div>'


CONTACTO = '''<div class="contacto">
    <span><b>WhatsApp</b> +57 323 910 3261</span>
    <span><b>Web</b> holmanglobalgroup.com</span>
    <span><b>Instagram</b> @holmanglobalgroup</span>
  </div>'''


def portada(img, kicker, t1, t2, lede, pills):
    p = "".join(f"<span>{x}</span>" for x in pills)
    return f'''<section class="page cover">
  <div class="cover-logo brand"><img src="{LOGO}" alt="">Holman Global Group</div>
  <div class="cover-img">{f'<img src="{img}" alt="">' if img else ''}</div>
  <div class="cover-body">
    <p class="kicker">{kicker}</p>
    <h1>{t1} <span>{t2}</span></h1>
    <p class="lede">{lede}</p>
    <div class="pills">{p}</div>
  </div>
  <div class="cover-foot">
    <div class="who">Holman Global Group<small>Coaching · Marketing · Software</small></div>
    <div class="web">holmanglobalgroup.com<br>WhatsApp +57 323 910 3261</div>
  </div>
</section>'''


def documento(titulo, extra_css, paginas):
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{titulo} · Holman Global Group</title>
<link href="https://fonts.googleapis.com/css2?family=Questrial&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">
<style>
  /* Portafolio de HGG para aliados (nov 2026), mismo estilo que
     docs/marca/presentacion/marca-con-huella.html. Hojas A4; se exporta con
     Chrome --print-to-pdf. La versión sin precios oculta .solo-precio. */{css}{EXTRA}{extra_css}
</style>
</head>
<body>
{paginas}
</body>
</html>
'''


# ------------------------------------------------------------------ SENTIDO
S = "Programa Sentido"
sentido = "\n\n".join([
    portada("../../../public/tienda/sentido-hero.webp", "Coaching 1 a 1 con Holman", "Programa", "Sentido",
            "Claridad sobre quién eres y hacia dónde vas. Te acompañamos a fijar una meta que te importa y a cumplirla en 90 días.",
            ["Sesiones 1 a 1 por Zoom", "Fórmula M2H2", "Tu avance en «Mi proceso»", "Desde una sesión"]),

    f'''<section class="page p2">
  {top(S, "01 · QUÉ ES")}
  <p class="kicker">El programa</p>
  <h2>Claridad para saber quién eres<br>y hacia dónde vas.</h2>
  <div class="rule"></div>
  <p class="intro">El Programa Sentido es coaching 1 a 1 para personas en un momento de cambio. Primero vemos tu vida completa y eliges una meta que de verdad te importa; después trabajamos, sesión a sesión, lo que necesitas para cumplirla.</p>
  <div class="promesa">Que sepas qué quieres, por qué lo quieres y qué hacer cada semana para lograrlo.</div>

  <div class="grid2">
    <div class="box">
      <p class="kicker">Es para ti si dices…</p>
      <div class="frases">
        <p>«Siento que lo que hago ya me quedó pequeño.»</p>
        <p>«Quiero vivir de lo que me gusta y no sé por dónde empezar.»</p>
        <p>«Estoy en un momento de cambio y quiero decidir bien.»</p>
      </div>
    </div>
    <div class="box">
      <p class="kicker">Lo que cambia</p>
      <h4>De la duda a un plan</h4>
      <p>Pasas de darle vueltas a lo mismo a tener una meta clara, un plan por semanas y a alguien que te acompaña a cumplirlo.</p>
    </div>
  </div>

  <p class="kicker" style="margin-top:7mm">El camino: Fórmula M2H2</p>
  <div class="m2h2">
    <div><b>M</b><h4>Metas</h4><p>Ves tu vida completa y eliges la meta a 90 días que mueve todo lo demás.</p></div>
    <div><b>M</b><h4>Mentalidad</h4><p>Trabajas las creencias y la relación con el dinero que te frenan.</p></div>
    <div><b>H</b><h4>Habilidades</h4><p>Aprendes lo que tu meta te pide y cómo ponerlo en práctica.</p></div>
    <div><b>H</b><h4>Hábitos</h4><p>Compromisos semanales y seguimiento para que el cambio se quede.</p></div>
  </div>

  <div class="persona solo">
    <img src="../../../public/equipo/holman.jpg" alt="">
    <div><h4>Holman Orjuela</h4><p class="rol">Coach · CEO de HGG</p><p>Acompaña a cada persona con la filosofía Corazón de Elefante y la Fórmula M2H2: claridad primero, acción después.</p></div>
  </div>
  {foot()}
</section>''',

    f'''<section class="page p3">
  {top(S, "02 · PAQUETES")}
  <p class="kicker">Tres formas de empezar</p>
  <h2>Elige hasta dónde quieres llegar.</h2>
  <p class="sub">El camino es el mismo en los tres; cambia cuánto tiempo te acompañamos.</p>

  <div class="planes">
    <div class="plan">
      <div class="img"><img src="../../../public/tienda/sentido-starter.webp" alt=""></div>
      <div class="body">
        <h3>Starter</h3>
        <p class="tag">Tu meta y tu plan de 90 días, en una sesión.</p>
        <ul>
          {li("Una <b>sesión 1 a 1</b> de 90 minutos")}
          {li("<b>Test de autodescubrimiento</b> y Rueda de la Vida")}
          {li("<b>Tu plan de 90 días</b> por escrito")}
          {li("Se descuenta si sigues al Pro")}
        </ul>
        {precio1("Pago único", "$67", "USD · 1 sesión")}
      </div>
    </div>

    <div class="plan">
      <div class="img"><img src="../../../public/tienda/sentido-pro.webp" alt=""></div>
      <div class="body">
        <h3>Pro</h3>
        <p class="tag">90 días para cumplir tu primera meta.</p>
        <ul>
          {li("<b>8 sesiones 1 a 1</b> en 12 semanas")}
          {li("Tu avance en <b>«Mi proceso»</b>: tu meta, tus compromisos y el acta de cada sesión")}
          {li("<b>Test del patrón del dinero</b>")}
          {li("<b>ECOS Business Club</b> mientras dura tu programa")}
        </ul>
        {precio2(3, 177, 497, 34)}
      </div>
    </div>

    <div class="plan top-pick">
      <span class="badge">Más elegido</span>
      <div class="img"><img src="../../../public/tienda/sentido-elite.webp" alt=""></div>
      <div class="body">
        <h3>Elite</h3>
        <p class="tag">Seis meses: dos metas cumplidas y hábitos que se quedan.</p>
        <ul>
          {li("<b>Todo lo del Pro</b>")}
          {li("<b>16 sesiones 1 a 1</b> en 6 meses")}
          {li("<b>WhatsApp directo</b> con Holman entre sesiones")}
          {li("Tu <b>Rueda de la Vida</b> a los 3 y a los 6 meses")}
        </ul>
        {precio2(6, 157, 897, 45)}
      </div>
    </div>
  </div>

  <div class="redes box">
    <p class="kicker">De un vistazo</p>
    <table>
      <tr><th></th><th>Starter</th><th>Pro</th><th>Elite</th></tr>
      <tr><td>Duración</td><td><b>1</b> sesión</td><td><b>90</b> días</td><td><b>6</b> meses</td></tr>
      <tr><td>Sesiones 1 a 1</td><td><b>1</b></td><td><b>8</b></td><td><b>16</b></td></tr>
      <tr><td>Metas cumplidas</td><td>Tu plan</td><td><b>1</b></td><td><b>2</b></td></tr>
    </table>
  </div>
  <p class="nota solo-precio">Precios en dólares (USD). Se puede pagar con tarjeta desde cualquier país.</p>
  <p class="nota sin-precio">Pregúntanos por la inversión de cada paquete: Pro y Elite se pueden pagar de contado o en cuotas mensuales, con tarjeta desde cualquier país.</p>
  {foot()}
</section>''',

    f'''<section class="page p4">
  {top(S, "03 · CÓMO FUNCIONA")}
  <p class="kicker">Plan de trabajo</p>
  <h2>90 días, un paso por mes.</h2>
  <p class="sub">Así se vive el Pro. En Elite, el ciclo se repite con una segunda meta (meses 4 a 6).</p>

  <div class="linea">
    <div class="etapa">
      <div class="mes"><small>Mes</small><span class="n">1</span><span>Semanas 1 a 4</span></div>
      <div>
        <h3>Metas y mentalidad</h3>
        <ul>
          {li("<strong>Tu punto de partida:</strong> la Rueda de la Vida y el test de autodescubrimiento muestran dónde estás hoy.")}
          {li("<strong>Tu meta a 90 días,</strong> la que mueve todo lo demás, con su plan por semanas.")}
          {li("<strong>Las creencias que te frenan,</strong> incluido el test del patrón del dinero.")}
        </ul>
      </div>
    </div>
    <div class="etapa">
      <div class="mes"><small>Mes</small><span class="n">2</span><span>Semanas 5 a 8</span></div>
      <div>
        <h3>Habilidades</h3>
        <ul>
          {li("<strong>Aprendes lo que tu meta te pide</strong> y lo pones en práctica cada semana.")}
          {li("<strong>Compromisos semanales</strong> que tú mismo marcas en «Mi proceso».")}
          {li("<strong>El acta de cada sesión,</strong> para que nada se pierda.")}
        </ul>
      </div>
    </div>
    <div class="etapa">
      <div class="mes"><small>Mes</small><span class="n">3</span><span>Semanas 9 a 12</span></div>
      <div>
        <h3>Hábitos</h3>
        <ul>
          {li("<strong>Rutinas que se quedan,</strong> para que el cambio no dependa de la motivación.")}
          {li("<strong>Tu Rueda del inicio junto a la de ahora:</strong> ves cuánto creciste.")}
          {li("<strong>Tu siguiente meta,</strong> clara y con plan.")}
        </ul>
      </div>
    </div>
  </div>

  <div class="sellos">
    <p><strong>Todo por Zoom.</strong> Las sesiones son 1 a 1 por videollamada, desde cualquier país, y tu avance queda en tu panel «Mi proceso».</p>
    <p><strong>Empieza sin riesgo.</strong> Si haces el Starter y sigues al Pro, lo que pagaste se descuenta.</p>
  </div>
  {CONTACTO}
  {foot("Holman Global Group LLC", "Noviembre 2026")}
</section>''',
])

# ------------------------------------------------------------------ SERVICIOS
V = "Servicios para tu empresa"
servicios = "\n\n".join([
    portada("", "Piezas sueltas", "Servicios para", "tu empresa",
            "La pieza que te falta: tu empresa en Estados Unidos, tu sitio web, tus campañas y redes o un sistema con inteligencia artificial.",
            ["LLC en EE. UU.", "Sitios web", "Campañas y redes", "Inteligencia artificial"]),

    f'''<section class="page p3">
  {top(V, "01 · EMPRESA Y PUBLICIDAD")}
  <p class="kicker">Tu empresa en Estados Unidos</p>
  <h2>LLC Global.</h2>
  <p class="sub">Creamos tu empresa en EE. UU. o la mantenemos al día cada año, con estrategia incluida.</p>
  <div class="llc">
    <div class="serv">
      <p class="kicker">Qué incluye</p>
      <ul>
        {li("<b>Creación completa</b> de tu LLC y tu número EIN")}
        {li("<b>Renovación anual</b> y Annual Report")}
        {li("<b>Consultoría estratégica</b> personalizada")}
        {li("Acceso a <b>FLOW</b> (DelegaWork)")}
      </ul>
    </div>
    <div class="serv">
      <p class="kicker">Para quién</p>
      <p class="tag" style="margin-top:6px">Emprendedores y empresas que venden a clientes de otros países y quieren cobrar en dólares, con una empresa en regla.</p>
      <div style="height:5mm"></div>
      {precio1("Creación o renovación anual", "$1,175", "USD · lo mismo cada año")}
    </div>
  </div>

  <div class="bloque-titulo">
    <p class="kicker">Campañas y redes</p>
    <h2>Para que te vean.</h2>
  </div>
  <div class="servicios c2">
    <div class="serv">
      <p class="kicker">Publicidad</p>
      <h3>Configuración de campaña</h3>
      <p class="tag">Tu primera campaña publicitaria, lista para lanzar.</p>
      <ul>
        {li("Configuración completa de <b>1 campaña</b>")}
        {li("Objetivo, audiencia y estructura de anuncios")}
        {li("El presupuesto de anuncios lo pagas tú, directo a la plataforma")}
      </ul>
      {precio1("Pago único", "$200", "USD")}
    </div>
    <div class="serv">
      <p class="kicker">Contenido</p>
      <h3>Gestión de redes sociales</h3>
      <p class="tag">Contenido constante que construye comunidad.</p>
      <ul>
        {li("<b>3 publicaciones y 1 video</b> por semana, producidos y publicados")}
        {li("Guía de cada pieza antes de publicar")}
        {li("Mentoría inicial sobre autenticidad en redes")}
      </ul>
      {precio1("Mensual", "$200", "USD al mes")}
    </div>
  </div>
  {foot()}
</section>''',

    f'''<section class="page p3">
  {top(V, "02 · WEB E INTELIGENCIA ARTIFICIAL")}
  <p class="kicker">Sitios web</p>
  <h2>Tu casa digital.</h2>
  <p class="sub">Tres opciones, según lo que tu negocio necesite hoy.</p>
  <div class="servicios c3">
    <div class="serv">
      <p class="kicker">Una oferta</p>
      <h3>Landing page</h3>
      <p class="tag">Diseñada para convertir visitas en clientes.</p>
      <ul>
        {li("Estrategia de conversión y diseño")}
        {li("Dominio y hosting configurados")}
        {li("SEO básico")}
        {li("Entrega y revisión contigo")}
      </ul>
      {precio1("Pago único", "$648", "USD")}
    </div>
    <div class="serv">
      <p class="kicker">Tu negocio</p>
      <h3>Web con panel</h3>
      <p class="tag">Cambias tu contenido tú mismo, desde cualquier dispositivo.</p>
      <ul>
        {li("Panel de administración")}
        {li("Diseño que se adapta al celular")}
        {li("SEO básico")}
        {li("Entrega y revisión contigo")}
      </ul>
      {precio1("Pago único", "$1,080", "USD")}
    </div>
    <div class="serv">
      <p class="kicker">Vender en línea</p>
      <h3>Tienda en línea</h3>
      <p class="tag">Lista para vender desde el primer día.</p>
      <ul>
        {li("Tienda completa con catálogo")}
        {li("Pasarela de pago integrada")}
        {li("Pensada para vender")}
        {li("Entrega y revisión contigo")}
      </ul>
      {precio1("Pago único", "$2,160", "USD")}
    </div>
  </div>

  <div class="ia">
    <div>
      <p class="kicker">Inteligencia artificial</p>
      <h3>Tu propia IA, entrenada con la voz de tu marca.</h3>
      <p>Agentes de ventas, de soporte o asistentes internos que trabajan como parte de tu equipo.</p>
    </div>
    <span class="q">A la medida</span>
  </div>

  <div class="sellos" style="grid-template-columns:1fr">
    <p><strong>¿Necesitas varias piezas?</strong> Marca, sitio web y contenido juntos te salen mucho mejor en Marca con Huella, nuestro programa de 90 días.</p>
  </div>
  <p class="nota solo-precio">Precios en dólares (USD). Se puede pagar con tarjeta desde cualquier país.</p>
  <p class="nota sin-precio">Pregúntanos por la inversión de cada servicio. Se puede pagar con tarjeta desde cualquier país.</p>
  {CONTACTO}
  {foot("Holman Global Group LLC", "Noviembre 2026")}
</section>''',
])

SIN = "\n  .solo-precio { display: none !important; }"
CON = "\n  .sin-precio { display: none !important; }"
SERV_CSS = """
  /* Portada sin imagen: un sello grande de servicios */
  .cover-img { display: grid; place-items: center; background: radial-gradient(circle at 50% 45%, rgba(240,184,0,.14), transparent 60%), var(--bg-2); border: 1px solid var(--hair); }
  .cover-img::after { display: none; }
  .cover-img::before { content: ""; width: 70mm; height: 70mm; border-radius: 50%; border: 2px solid var(--gold-line);
    background: url("../../../public/marca/logo-h-claro.png") center / 46% no-repeat; box-shadow: 0 0 80px rgba(240,184,0,.18); }
  .cover h1 { font-size: 46pt; }
"""

for carpeta, nombre, base, extra, titulo in [
    ("docs/sentido/presentacion", "programa-sentido", sentido, "", "Programa Sentido"),
    ("docs/servicios/presentacion", "servicios-hgg", servicios, SERV_CSS, "Servicios para tu empresa"),
]:
    d = RAIZ / carpeta
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{nombre}.html").write_text(documento(titulo, extra + CON, base))
    (d / f"{nombre}-sin-precios.html").write_text(documento(titulo + " (sin precios)", extra + SIN, base))
print("ok")
