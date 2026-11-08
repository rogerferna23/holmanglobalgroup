-- ============================================
-- MIGRACION: Programa Sentido — precios de lanzamiento (nov 2026)
-- Ejecutar ANTES del deploy del front: la tabla `products` decide el importe
-- que cobra create-payment-intent.
-- ============================================
--
--   Starter  1 sesión de 90 min   $397 -> $67   (se descuenta si sigue al Pro)
--   Pro      90 días · 8 sesiones $697 -> $497  o 3 cuotas de $177
--   Elite    6 meses · 16 sesiones $997 -> $897 o 6 cuotas de $157  («Más elegido»)
--
-- Las cuotas se cobran como la oferta de la masterclass: el primer pago con
-- su propio producto (`*-cuota`); los siguientes, a mano.
--
-- Idempotente.

do $$ begin
  if to_regclass('public.products') is null then
    raise exception 'Proyecto equivocado: aqui no esta la tabla products. Esto va en el Supabase de la landing de HGG.';
  end if;
end $$;

update products set base_price = 67,  highlight = false, updated_at = now() where id = 'sentido-starter';
update products set base_price = 497, highlight = false, updated_at = now() where id = 'sentido-pro';
update products set base_price = 897, highlight = true,  updated_at = now() where id = 'sentido-elite';

insert into products (id, category, category_label, tag, title, base_price, unit, recurring, highlight, active, sort_order) values
  ('sentido-pro-cuota',   'coaching', 'Programa Sentido', 'Pro',   'Programa Sentido Pro — 1 de 3 pagos',   177, 'USD', false, false, true, 13),
  ('sentido-elite-cuota', 'coaching', 'Programa Sentido', 'Elite', 'Programa Sentido Elite — 1 de 6 pagos', 157, 'USD', false, false, true, 14)
on conflict (id) do update set
  title = excluded.title, base_price = excluded.base_price, category = excluded.category,
  category_label = excluded.category_label, tag = excluded.tag, active = true, updated_at = now();

-- Esperado: 67 / 497 / 897 / 177 / 157, solo Elite con highlight, todos activos.
select id, base_price, highlight, active
  from products
 where id like 'sentido-%'
 order by sort_order;
