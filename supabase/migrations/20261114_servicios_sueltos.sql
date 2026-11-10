-- ============================================
-- MIGRACION: piezas sueltas de vuelta en la tienda (nov 2026)
-- Ejecutar ANTES del deploy del front: la tabla `products` decide el importe
-- que cobra create-payment-intent.
-- ============================================
--
-- Vuelven los sitios web (mismos precios) y campañas y redes como piezas
-- sueltas; el paquete completo es Marca con Huella.
--
--   Configuración de Campaña   $300      -> $200
--   Gestión de Redes Sociales  $600/mes  -> $200/mes
--
-- Idempotente.

do $$ begin
  if to_regclass('public.products') is null then
    raise exception 'Proyecto equivocado: aqui no esta la tabla products. Esto va en el Supabase de la landing de HGG.';
  end if;
end $$;

update products set base_price = 200, active = true, updated_at = now() where id = 'nexco-config';
update products set base_price = 200, active = true, updated_at = now() where id = 'nexco-redes';
update products set active = true, updated_at = now() where id in ('web-landing', 'web-panel', 'web-ecommerce');

-- Esperado: nexco 200 / 200; webs 648 / 1080 / 2160; todos activos.
select id, base_price, active
  from products
 where id in ('nexco-config', 'nexco-redes', 'web-landing', 'web-panel', 'web-ecommerce')
 order by sort_order;
