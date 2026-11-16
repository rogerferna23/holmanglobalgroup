-- Horario fijo de ECOS (7 nov 2026, Holman): todas las clases a las 8:00 p. m.
-- hora de Miami.
--   lunes   ventas     · Zack
--   martes  oratoria   · Julio
--   jueves  oratoria   · Holman
--   viernes marketing  · Ingrid
--
-- ecos_programar_clases(desde, hasta) crea las clases de esos días (id
-- AAAA-MM-DD-materia) y no toca las que ya existen. Una tarea diaria crea la
-- del día que queda a 4 semanas, así el panel siempre muestra ~4 semanas por
-- delante. Si se borra una clase (un festivo), la tarea no la vuelve a crear,
-- porque solo mira el día a 4 semanas.
-- Para cambiar el horario: se edita el VALUES de abajo.

create or replace function ecos_programar_clases(desde date, hasta date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  insert into ecos_sessions (id, starts_at, kind, subject, title, teacher, published, open_to_guests)
  select to_char(d, 'YYYY-MM-DD') || '-' || h.subject,
         (d + time '20:00') at time zone 'America/New_York',
         'clase', h.subject, h.title, h.teacher, true, false
  from generate_series(desde, hasta, interval '1 day') as g(dd)
  cross join lateral (select g.dd::date as d) x
  join (values
    (1, 'ventas',    'Clase de ventas',    'Zack'),
    (2, 'oratoria',  'Clase de oratoria',  'Julio'),
    (4, 'oratoria',  'Clase de oratoria',  'Holman'),
    (5, 'marketing', 'Clase de marketing', 'Ingrid')
  ) as h(dow, subject, title, teacher) on extract(isodow from d) = h.dow
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function ecos_programar_clases(date, date) from public, anon, authenticated;

select cron.unschedule('ecos-programar-clases')
where exists (select 1 from cron.job where jobname = 'ecos-programar-clases');

select cron.schedule(
  'ecos-programar-clases',
  '0 12 * * *',
  $$ select ecos_programar_clases(
       ((now() at time zone 'America/New_York')::date + 28),
       ((now() at time zone 'America/New_York')::date + 28)) $$
);

-- Primeras 4 semanas (desde el lunes 9 nov).
select ecos_programar_clases(date '2026-11-09', (now() at time zone 'America/New_York')::date + 28);

update ecos_settings
set value = 'Lunes ventas · martes y jueves oratoria · viernes marketing · todas a las 8:00 p. m. hora de Miami (en tu panel la ves en tu hora)'
where key = 'horario';
