-- Martes de oratoria, viernes de negocio (ventas y marketing alternados).
--
--   Semana 1   mar 6  oratoria (Holman)   ·  vie 9  ventas (Zack)
--   Semana 2   mar 13 oratoria (nueva)    ·  vie 16 marketing (Ingrid)
--   Semana 3   mar 20 oratoria (Holman)   ·  vie 23 ventas (Zack)
--   Semana 4   mar 27 oratoria (nueva)    ·  vie 30 marketing (Ingrid)
--   Masterclass de Holman: lun 2 nov (antes vie 30 oct)
--
-- Las oratorias del 13 y el 27 quedan sin profesor (probablemente Julio
-- Ballén); el nombre se pone despues desde el admin, Clases. Sin profesor el
-- panel solo muestra la fecha.
--
-- La masterclass se MUEVE al 2 de noviembre con todo lo que tenga (tema,
-- descripcion, Zoom, invitados ya inscritos) y a la misma hora local. La fila
-- del 30 se queda con su id y pasa a ser la clase de marketing de Ingrid.
--
-- Se puede correr mas de una vez: cada paso solo actua si aun no se hizo.

-- El guardia de profesores no deja tocar materia ni profesor desde el editor
-- SQL (no hay sesion de admin): se apaga solo durante el cambio.
alter table ecos_sessions disable trigger ecos_sessions_guard_teacher;

-- 1. Oratoria los martes 13 y 27, a la hora de la del 6 ---------------------
insert into ecos_sessions (id, starts_at, kind, subject, title, published)
select v.id, o.starts_at + v.dias * interval '1 day', 'clase', 'oratoria', 'Clase de oratoria', true
from (select starts_at from ecos_sessions
      where subject = 'oratoria'
        and (starts_at at time zone 'America/New_York')::date = '2026-10-06'
      limit 1) o
cross join (values ('2026-10-13-oratoria', 7), ('2026-10-27-oratoria', 21)) as v(id, dias)
on conflict (id) do nothing;

-- 2. La masterclass del 30 de octubre pasa al lunes 2 de noviembre ----------
-- Misma hora en Nueva York (el 1 de noviembre termina el horario de verano).
insert into ecos_sessions (id, starts_at, kind, subject, title, teacher, teacher_id, description,
                           zoom_url, recording_id, open_to_guests, published)
select '2026-11-02-masterclass',
       ('2026-11-02'::date + (m.starts_at at time zone 'America/New_York')::time) at time zone 'America/New_York',
       m.kind, m.subject, m.title, m.teacher, m.teacher_id, m.description,
       m.zoom_url, m.recording_id, m.open_to_guests, m.published
from ecos_sessions m
where m.kind = 'masterclass'
  and (m.starts_at at time zone 'America/New_York')::date = '2026-10-30'
on conflict (id) do nothing;

-- Los invitados que ya se inscribieron se van con la masterclass
update ecos_guests g
set session_id = '2026-11-02-masterclass'
from ecos_sessions m
where g.session_id = m.id
  and m.kind = 'masterclass'
  and (m.starts_at at time zone 'America/New_York')::date = '2026-10-30'
  and exists (select 1 from ecos_sessions where id = '2026-11-02-masterclass');

-- 3. El viernes 30 queda para marketing con Ingrid (la misma de la del 16) --
update ecos_sessions s
set kind = 'clase', subject = 'marketing', title = 'Clase de marketing',
    teacher = mk.teacher, teacher_id = mk.teacher_id,
    description = null, zoom_url = null, recording_id = null, open_to_guests = false
from (select teacher, teacher_id from ecos_sessions
      where subject = 'marketing'
        and (starts_at at time zone 'America/New_York')::date = '2026-10-16'
      limit 1) mk
where s.kind = 'masterclass'
  and (s.starts_at at time zone 'America/New_York')::date = '2026-10-30'
  and exists (select 1 from ecos_sessions where id = '2026-11-02-masterclass');

alter table ecos_sessions enable trigger ecos_sessions_guard_teacher;

-- Comprobar como quedo el calendario
select
  to_char(starts_at at time zone 'America/New_York', 'Dy DD Mon HH12:MI AM') as "hora del Este",
  kind, subject, teacher, title, published
from ecos_sessions
where starts_at >= '2026-10-01' and starts_at < '2026-11-08'
order by starts_at;
