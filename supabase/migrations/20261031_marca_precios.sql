-- ============================================
-- MIGRACION: Marca con Huella — precios 26 oct 2026
-- Ejecutar ANTES del deploy del front (la tabla `products` decide el importe
-- que cobra create-payment-intent).
-- ============================================
--
-- La promesa pasa a ser una marca rentable. Sin campañas ni redes mientras no
-- haya quién las haga.
--
--   Starter  marca + oferta principal con precio            $797  -> $897
--   Pro      + mapa de oferta + web para vender            $1.597 -> $1.797  («Más elegido»)
--   Elite    + plan financiero + guion + 60 días           $3.000 -> $2.497
--
-- Idempotente.

do $$ begin
  if to_regclass('public.products') is null then
    raise exception 'Proyecto equivocado: aqui no esta la tabla products. Esto va en el Supabase de la landing de HGG.';
  end if;
end $$;

update products set base_price = 897,  updated_at = now() where id = 'marca-esencial';
update products set base_price = 1797, updated_at = now() where id = 'marca-pro';
update products set base_price = 2497, updated_at = now() where id = 'marca-360';

-- Esperado: 897 / 1797 / 2497, los tres activos.
select id, base_price, highlight, active
  from products
 where id in ('marca-esencial', 'marca-pro', 'marca-360')
 order by sort_order;
