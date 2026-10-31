-- Oferta de la masterclass: una sola, con 2 cupos (31 oct 2026).
--
-- Holman la reduce: no sabe cuántas personas lleguen y 5 + 5 cupos no se
-- creía. Queda solo «Negocio Digital en 90 días» con 2 cupos; Sentido Elite
-- se apaga (la página /oferta ya no lo muestra) y el resto se invita al club.
-- El trigger que cierra la oferta al llenarse lee estos cupos, así que se
-- apaga sola con la segunda venta. Se puede correr más de una vez.

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
    'negocio', json_build_object('cupos', 2, 'vendidos', v.negocio,
      'abierta', (select bool_and(active) from products where id in ('mc-negocio-digital', 'mc-negocio-digital-cuota'))),
    'sentido', json_build_object('cupos', 0, 'vendidos', v.sentido, 'abierta', false)
  )
  from vendidos v;
$$;

update products set active = false, updated_at = now()
where id in ('mc-sentido-elite', 'mc-sentido-elite-cuota') and active;

-- Para revisar
select hgg_oferta_estado();
