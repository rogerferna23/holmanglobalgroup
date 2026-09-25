-- Dias fijos: martes oratoria, viernes ventas.
--
--   Semana 1   mar 6 oratoria (Holman)   ·  vie 9  ventas (Zack)
--   Semana 2                              ·  vie 16 marketing (Ingrid)
--   Semana 3   mar 20 oratoria (Holman)  ·  vie 23 ventas (Zack)
--   Semana 4                              ·  vie 30 masterclass
--
-- Antes el 9 era oratoria y el 20 ventas. Se INTERCAMBIA todo lo de esas dos
-- sesiones (materia, profesor, quien la prepara, tema, descripcion, Zoom): si
-- alguien ya escribio el tema de su clase, se va con su clase a la nueva
-- fecha. Las fechas y los ids se quedan donde estan (el id de la del 9 dice
-- «oratoria-practica» por historia; no se muestra en ningun lado).
--
-- Se puede correr mas de una vez: solo cambia si el 9 todavia es oratoria y
-- el 20 todavia es ventas, asi que una segunda corrida no las devuelve.

-- El guardia de profesores no deja tocar materia ni profesor desde el editor
-- SQL (no hay sesion de admin): se apaga solo durante el cambio.
alter table ecos_sessions disable trigger ecos_sessions_guard_teacher;

with a as (select * from ecos_sessions where id = '2026-10-09-oratoria-practica' and subject = 'oratoria'),
     b as (select * from ecos_sessions where id = '2026-10-20-ventas' and subject = 'ventas'),
     x as (
       select '2026-10-09-oratoria-practica' as destino, b.subject, b.teacher, b.teacher_id, b.title, b.description, b.zoom_url
       from b where exists (select 1 from a)
       union all
       select '2026-10-20-ventas', a.subject, a.teacher, a.teacher_id, a.title, a.description, a.zoom_url
       from a where exists (select 1 from b)
     )
update ecos_sessions s
set subject = x.subject, teacher = x.teacher, teacher_id = x.teacher_id,
    title = x.title, description = x.description, zoom_url = x.zoom_url, kind = 'clase'
from x
where s.id = x.destino;

alter table ecos_sessions enable trigger ecos_sessions_guard_teacher;

-- Comprobar como quedo octubre
select
  to_char(starts_at at time zone 'America/New_York', 'Dy DD Mon HH12:MI AM') as "hora del Este",
  kind, subject, teacher, title
from ecos_sessions
where starts_at >= '2026-10-01' and starts_at < '2026-11-01'
order by starts_at;
