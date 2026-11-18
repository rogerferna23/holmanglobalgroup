-- ============================================
-- MIGRACION: Marca con Huella — cupos y precios por fases (17 nov 2026)
-- Va en el Supabase de la landing de HGG (el de la tabla `products`).
-- Se puede correr más de una vez. El front funciona antes y después de correrla:
-- sin ella no se ve el contador y los precios se quedan en la fase 1.
-- ============================================
--
-- Holman: los primeros clientes entran a precio de lanzamiento y, al llenarse
-- cada fase, el precio sube solo.
--
--   Fase 1 · marcas 1–10   Starter 1.097 / 3 × 400   Pro 1.497 / 3 × 550    Elite 2.197 / 3 × 800
--   Fase 2 · marcas 11–20  Starter 1.497 / 3 × 550   Pro 1.997 / 3 × 750    Elite 2.997 / 3 × 1.100
--   Fase 3 · desde la 21   Starter 1.997 / 3 × 700   Pro 2.797 / 3 × 1.000  Elite 3.997 / 3 × 1.400
--
-- Una «marca» es un cliente (correo) con una venta aprobada de cualquier
-- paquete de Marca desde el 8 nov 2026 (cuando empezó el programa de 90 días).
-- Las cuotas 2 y 3 del mismo cliente no cuentan dos veces.
-- Los mismos precios viven en el front: src/lib/marca-fases.ts.

do $$ begin
  if to_regclass('public.products') is null or to_regclass('public.manual_sales') is null then
    raise exception 'Proyecto equivocado: esto va en el Supabase de la landing de HGG.';
  end if;
end $$;

-- Marcas vendidas. AJUSTE: para sumar (o restar) clientes que pagaron por fuera
-- y no están en manual_sales, cambia el 0 y vuelve a correr este archivo.
create or replace function hgg_marca_vendidas()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select (count(distinct coalesce(nullif(lower(trim(client_email)), '—'), id)) + 0)::int
    from manual_sales
   where status = 'Aprobado'
     and date >= date '2026-11-08'
     and service_id in ('marca-esencial', 'marca-pro', 'marca-360',
                        'marca-esencial-cuota', 'marca-pro-cuota', 'marca-360-cuota');
$$;

create or replace function hgg_marca_cupos()
returns json
language sql
security definer
set search_path = public
stable
as $$
  with v as (select hgg_marca_vendidas() as n)
  select json_build_object(
    'vendidas', n,
    'cupos', 10,
    'fase', least(3, n / 10 + 1),
    'quedan', case when n >= 20 then 0 else 10 - n % 10 end
  ) from v;
$$;

revoke all on function hgg_marca_vendidas() from public;
revoke all on function hgg_marca_cupos() from public;
grant execute on function hgg_marca_cupos() to anon, authenticated;

-- Pone en `products` (lo que cobra create-payment-intent) los precios de la fase actual.
create or replace function hgg_marca_sincronizar_precios()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  f int := least(3, hgg_marca_vendidas() / 10 + 1);
begin
  update products p set base_price = x.precio, updated_at = now()
    from (values
      ('marca-esencial',       (array[1097, 1497, 1997])[f]),
      ('marca-pro',            (array[1497, 1997, 2797])[f]),
      ('marca-360',            (array[2197, 2997, 3997])[f]),
      ('marca-esencial-cuota', (array[ 400,  550,  700])[f]),
      ('marca-pro-cuota',      (array[ 550,  750, 1000])[f]),
      ('marca-360-cuota',      (array[ 800, 1100, 1400])[f])
    ) as x(id, precio)
   where p.id = x.id and p.base_price is distinct from x.precio;
end;
$$;

revoke all on function hgg_marca_sincronizar_precios() from public, anon, authenticated;

create or replace function hgg_marca_fase_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform hgg_marca_sincronizar_precios();
  return null;
end;
$$;

drop trigger if exists hgg_marca_fase on manual_sales;
create trigger hgg_marca_fase
  after insert or update of status on manual_sales
  for each row when (new.service_id like 'marca-%')
  execute function hgg_marca_fase_trigger();

select hgg_marca_sincronizar_precios();

-- Para revisar: cuántas van, la fase y los precios que se están cobrando.
select hgg_marca_cupos();
select id, base_price from products where id like 'marca-%' order by sort_order;
