-- ============================================
-- MIGRACION: Programa Sentido — precios oct 2026
-- Ejecutar ANTES del deploy del front (la tabla `products` decide el importe
-- que cobra create-payment-intent).
-- ============================================
--
-- Los tres paquetes recorren el mismo camino (Claridad · Identidad · Acción);
-- cambia el número de sesiones. Precio por sesión: $132 · $116 · $100.
--
--   Starter  3 sesiones   $397  (igual)
--   Pro      6 sesiones   $747 -> $697
--   Elite   10 sesiones $1.097 -> $997   (pasa a llevar «Más elegido»)
--
-- Idempotente.

do $$ begin
  if to_regclass('public.products') is null then
    raise exception 'Proyecto equivocado: aqui no esta la tabla products. Esto va en el Supabase de la landing de HGG.';
  end if;
end $$;

update products set base_price = 397, highlight = false, updated_at = now() where id = 'sentido-starter';
update products set base_price = 697, highlight = false, updated_at = now() where id = 'sentido-pro';
update products set base_price = 997, highlight = true,  updated_at = now() where id = 'sentido-elite';

-- Esperado: 397 / 697 / 997, solo Elite con highlight, los tres activos.
select id, base_price, highlight, active
  from products
 where id like 'sentido-%'
 order by sort_order;
