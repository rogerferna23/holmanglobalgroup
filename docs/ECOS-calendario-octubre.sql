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
-- Los títulos son genéricos y las descripciones van vacías a propósito: cada
-- profesor escribe de qué va su clase desde «Mis clases», en su panel.
--
-- Se puede volver a correr sin miedo: si la sesión ya existe, solo ajusta la
-- fecha y el tipo. NO pisa el título ni la descripción, para no borrar lo que
-- el profesor ya haya escrito.
-- =====================================================================

insert into ecos_sessions
  (id, starts_at, kind, subject, title, teacher, description, open_to_guests, published)
values
  ('2026-10-06-oratoria',          '2026-10-06T20:00:00-04:00', 'clase',       'oratoria',  'Clase de oratoria',     'Holman', null, false, true),
  ('2026-10-09-oratoria-practica', '2026-10-09T20:00:00-04:00', 'clase',       'oratoria',  'Clase de oratoria',      'Holman', null, false, true),
  ('2026-10-16-marketing',         '2026-10-16T20:00:00-04:00', 'clase',       'marketing', 'Taller de marketing',   'Ingrid', null, false, true),
  ('2026-10-20-ventas',            '2026-10-20T20:00:00-04:00', 'clase',       'ventas',    'Clase de ventas',       'Zack',   null, false, true),
  ('2026-10-23-ventas-practica',   '2026-10-23T20:00:00-04:00', 'clase',       'ventas',    'Clase de ventas',       'Zack',   null, false, true),
  -- Abierta a invitados: es la puerta por donde entra gente nueva al club.
  ('2026-10-30-masterclass',       '2026-10-30T20:00:00-04:00', 'masterclass', 'abierta',   'Masterclass de octubre','Holman', null, true,  true)

on conflict (id) do update set
  starts_at      = excluded.starts_at,
  kind           = excluded.kind,
  subject        = excluded.subject,
  teacher        = excluded.teacher,
  open_to_guests = excluded.open_to_guests,
  published      = excluded.published;


-- Comprobar cómo quedó
select
  to_char(starts_at at time zone 'America/New_York', 'Dy DD Mon HH12:MI AM') as "hora del Este",
  kind, subject, teacher, title, published
from ecos_sessions
where starts_at >= '2026-10-01' and starts_at < '2026-11-01'
order by starts_at;
