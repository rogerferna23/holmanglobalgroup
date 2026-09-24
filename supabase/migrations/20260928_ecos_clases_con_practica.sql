-- Ventas y oratoria ya no se dividen en «martes clase, viernes práctica»:
-- cada encuentro es clase con práctica (unos 15 min de teoría y el resto
-- práctica). Las dos sesiones de octubre que eran «práctica» pasan a clase.
--
-- Solo se cambia el título si sigue siendo el genérico, para no pisar lo que
-- el profesor ya haya escrito desde su panel. Se puede correr mas de una vez.

update ecos_sessions set kind = 'clase'
where id in ('2026-10-09-oratoria-practica', '2026-10-23-ventas-practica');

update ecos_sessions set title = 'Clase de oratoria'
where id = '2026-10-09-oratoria-practica' and title = 'Práctica de oratoria';

update ecos_sessions set title = 'Clase de ventas'
where id = '2026-10-23-ventas-practica' and title = 'Práctica de ventas';

-- Comprobar cómo quedó octubre
select
  to_char(starts_at at time zone 'America/New_York', 'Dy DD Mon HH12:MI AM') as "hora del Este",
  kind, subject, teacher, title
from ecos_sessions
where starts_at >= '2026-10-01' and starts_at < '2026-11-01'
order by starts_at;
