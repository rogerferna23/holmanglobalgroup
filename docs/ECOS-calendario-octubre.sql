-- =====================================================================
-- ECOS · Calendario de octubre 2026
-- =====================================================================
-- Supabase → SQL Editor → pegar → Run.
--
-- Todas a las 8:00 PM del Este. Esa hora se ancla al reloj de Estados Unidos
-- a propósito: cuando termine el horario de verano el 1 de noviembre, seguirá
-- siendo 8 PM en Miami, 7 en Houston y 5 en California. Al único que se le
-- corre la hora es a quien esté en Colombia, y es mejor que lo absorba él a
-- que se lo coman los que pagan.
--
-- Se puede volver a correr sin miedo: si la sesión ya existe, la actualiza.
-- =====================================================================

insert into ecos_sessions
  (id, starts_at, kind, subject, title, teacher, description, open_to_guests, published)
values

-- SEMANA 1 · Oratoria ------------------------------------------------
('2026-10-06-oratoria',
 '2026-10-06T20:00:00-04:00', 'clase', 'oratoria',
 'Decir lo que vendes para que te crean',
 'Holman',
 'Abrimos el club. Respiración, ritmo y mirada puestos al servicio de una sola cosa: que cuando expliques lo que haces, la otra persona te crea. Sales con tu presentación de treinta segundos armada.',
 false, true),

('2026-10-09-oratoria-practica',
 '2026-10-09T20:00:00-04:00', 'practica', 'oratoria',
 'Práctica: cinco minutos de pie',
 'Holman',
 'Cada quien pasa, habla y la sala le devuelve lo que ve. No hay teoría: es el día en que se descubre qué hace el cuerpo cuando uno no lo está mirando.',
 false, true),

-- SEMANA 2 · Marketing -----------------------------------------------
('2026-10-16-marketing',
 '2026-10-16T20:00:00-04:00', 'clase', 'marketing',
 'Taller: tu oferta hecha pieza',
 'Ingrid',
 'Taller, no cátedra: se diseña en vivo. Sales del viernes con tu flyer o tu publicación terminada y publicada.',
 false, true),

-- SEMANA 3 · Ventas --------------------------------------------------
('2026-10-20-ventas',
 '2026-10-20T20:00:00-04:00', 'clase', 'ventas',
 'La oferta que se entiende a la primera',
 'Zack',
 'Qué vendes en realidad por debajo de lo que crees que vendes, a quién le sirve, y cómo se dice el precio sin bajar la voz.',
 false, true),

('2026-10-23-ventas-practica',
 '2026-10-23T20:00:00-04:00', 'practica', 'ventas',
 'Práctica de ventas: rol play',
 'Zack',
 'Uno vende, otro hace de cliente con objeciones reales, la sala observa y devuelve. Aquí es donde se despega el que practica del que solo escucha.',
 false, true),

-- SEMANA 4 · Masterclass ---------------------------------------------
-- Abierta a invitados: es la puerta por donde entra gente nueva al club.
('2026-10-30-masterclass',
 '2026-10-30T20:00:00-04:00', 'masterclass', 'abierta',
 'Masterclass de octubre',
 'Holman',
 null,
 true, true)

on conflict (id) do update set
  starts_at      = excluded.starts_at,
  kind           = excluded.kind,
  subject        = excluded.subject,
  title          = excluded.title,
  teacher        = excluded.teacher,
  description    = excluded.description,
  open_to_guests = excluded.open_to_guests,
  published      = excluded.published;


-- Comprobar cómo quedó
select
  to_char(starts_at at time zone 'America/New_York', 'Dy DD Mon HH12:MI AM') as "hora del Este",
  kind, subject, teacher, title, published
from ecos_sessions
where starts_at >= '2026-10-01' and starts_at < '2026-11-01'
order by starts_at;
