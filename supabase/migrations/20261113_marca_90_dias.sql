-- ============================================
-- MIGRACION: Marca con Huella — programa de 90 días (nov 2026)
-- Ejecutar ANTES del deploy del front: la tabla `products` decide el importe
-- que cobra create-payment-intent.
-- ============================================
--
-- Marca con Huella pasa a ser un programa de 90 días hecho con Marisol.
-- Precios de lanzamiento (pendientes de confirmar con ella):
--
--   Starter  $897  -> $1.097 o 3 cuotas de $400
--   Pro      $1.797 -> $1.497 o 3 cuotas de $550  («Más elegido»)
--   Elite    $2.497 -> $2.197 o 3 cuotas de $800
--
-- Las cuotas cobran el primer pago con su propio producto (`*-cuota`); los
-- siguientes, a mano (como la oferta de la masterclass).
--
-- Idempotente.

do $$ begin
  if to_regclass('public.products') is null then
    raise exception 'Proyecto equivocado: aqui no esta la tabla products. Esto va en el Supabase de la landing de HGG.';
  end if;
end $$;

update products set base_price = 1097, updated_at = now() where id = 'marca-esencial';
update products set base_price = 1497, updated_at = now() where id = 'marca-pro';
update products set base_price = 2197, updated_at = now() where id = 'marca-360';

insert into products (id, category, category_label, tag, title, base_price, unit, recurring, highlight, active, sort_order) values
  ('marca-esencial-cuota', 'marca', 'Marca con Huella', 'Starter', 'Marca con Huella Starter — 1 de 3 pagos', 400, 'USD', false, false, true, 23),
  ('marca-pro-cuota',      'marca', 'Marca con Huella', 'Pro',     'Marca con Huella Pro — 1 de 3 pagos',     550, 'USD', false, false, true, 24),
  ('marca-360-cuota',      'marca', 'Marca con Huella', 'Elite',   'Marca con Huella Elite — 1 de 3 pagos',   800, 'USD', false, false, true, 25)
on conflict (id) do update set
  title = excluded.title, base_price = excluded.base_price, category = excluded.category,
  category_label = excluded.category_label, tag = excluded.tag, active = true, updated_at = now();

-- Esperado: 1097 / 1497 / 2197 / 400 / 550 / 800, todos activos.
select id, base_price, highlight, active
  from products
 where id like 'marca-%'
 order by sort_order;
