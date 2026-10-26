-- La oferta de la masterclass del 2 de noviembre de 2026 (/oferta).
--
-- Se vende en vivo, con cupo y fecha límite (miércoles 4 de noviembre,
-- 11:59 p. m. de Bogotá):
--   · «Negocio Digital en 90 días»: Marca con Huella Elite al precio del Pro,
--     $1.797 o 2 pagos de $937. 5 cupos.
--   · Programa Sentido Elite con los beneficios de la noche: $997 o 2 pagos
--     de $517. 5 cupos.
--
-- La tabla products decide lo que cobra create-payment-intent, y solo cobra
-- productos activos: al llenarse el cupo o vencer el plazo se apagan solos.
-- Las comisiones (embajador que invitó a la masterclass + closer) salen
-- solas del trigger de manual_sales.
--
-- Se puede correr más de una vez.

insert into products (id, category, category_label, tag, title, base_price, unit, recurring, highlight, active, sort_order) values
  ('mc-negocio-digital',        'oferta', 'Masterclass', 'Negocio Digital', 'Negocio Digital en 90 días (Marca con Huella Elite)', 1797, 'USD', false, false, true, 90),
  ('mc-negocio-digital-cuota',  'oferta', 'Masterclass', 'Negocio Digital', 'Negocio Digital en 90 días — 1 de 2 pagos',         937,  'USD', false, false, true, 91),
  ('mc-sentido-elite',          'oferta', 'Masterclass', 'Sentido Elite',   'Programa Sentido Elite (masterclass)',               997,  'USD', false, false, true, 92),
  ('mc-sentido-elite-cuota',    'oferta', 'Masterclass', 'Sentido Elite',   'Programa Sentido Elite — 1 de 2 pagos',              517,  'USD', false, false, true, 93)
on conflict (id) do update set
  title = excluded.title, base_price = excluded.base_price, category = excluded.category,
  category_label = excluded.category_label, tag = excluded.tag, updated_at = now();

-- Cuánto queda de cada oferta y hasta cuándo. La página la lee sin sesión.
create or replace function hgg_oferta_estado()
returns json
language sql
security definer
set search_path = public
stable
as $$
  with vendidos as (
    select
      count(*) filter (where service_id in ('mc-negocio-digital', 'mc-negocio-digital-cuota')) as negocio,
      count(*) filter (where service_id in ('mc-sentido-elite', 'mc-sentido-elite-cuota')) as sentido
    from manual_sales
    where status = 'Aprobado'
  )
  select json_build_object(
    'cierra', '2026-11-04T23:59:00-05:00',
    'negocio', json_build_object('cupos', 5, 'vendidos', v.negocio,
      'abierta', (select bool_and(active) from products where id in ('mc-negocio-digital', 'mc-negocio-digital-cuota'))),
    'sentido', json_build_object('cupos', 5, 'vendidos', v.sentido,
      'abierta', (select bool_and(active) from products where id in ('mc-sentido-elite', 'mc-sentido-elite-cuota')))
  )
  from vendidos v;
$$;

revoke all on function hgg_oferta_estado() from public;
grant execute on function hgg_oferta_estado() to anon, authenticated;

-- Al llenarse un cupo, esa oferta deja de cobrarse.
create or replace function hgg_oferta_cerrar_llenas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  e json := hgg_oferta_estado();
begin
  if (e -> 'negocio' ->> 'vendidos')::int >= (e -> 'negocio' ->> 'cupos')::int then
    update products set active = false, updated_at = now()
     where id in ('mc-negocio-digital', 'mc-negocio-digital-cuota') and active;
  end if;
  if (e -> 'sentido' ->> 'vendidos')::int >= (e -> 'sentido' ->> 'cupos')::int then
    update products set active = false, updated_at = now()
     where id in ('mc-sentido-elite', 'mc-sentido-elite-cuota') and active;
  end if;
  return null;
end;
$$;

drop trigger if exists hgg_oferta_cerrar_llenas on manual_sales;
create trigger hgg_oferta_cerrar_llenas
  after insert or update of status on manual_sales
  for each row when (new.service_id like 'mc-%')
  execute function hgg_oferta_cerrar_llenas();

-- Al vencer el plazo (jueves 5 de nov, 04:59 UTC = miércoles 11:59 p. m. Bogotá), se apaga todo.
select cron.unschedule('hgg-oferta-masterclass-cierre')
where exists (select 1 from cron.job where jobname = 'hgg-oferta-masterclass-cierre');
select cron.schedule('hgg-oferta-masterclass-cierre', '59 4 5 11 *',
  $$update products set active = false, updated_at = now() where id like 'mc-%' and active$$);

-- Cuántas personas registró cada miembro en la próxima masterclass (para su
-- panel y el premio a quien lleve más).
create or replace function hgg_mis_invitados_masterclass()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from ecos_guests g
  join ecos_sessions s on s.id = g.session_id
  where g.invited_by = auth.uid() and s.starts_at > now() - interval '1 day';
$$;

revoke all on function hgg_mis_invitados_masterclass() from public, anon;
grant execute on function hgg_mis_invitados_masterclass() to authenticated;

-- Para revisar
select hgg_oferta_estado();
