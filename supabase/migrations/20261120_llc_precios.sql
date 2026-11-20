-- ============================================
-- MIGRACION: LLC a precio real (nov 2026)
-- Ejecutar ANTES del deploy del front: la tabla `products` decide el importe
-- que cobra create-payment-intent.
-- ============================================
--
-- La LLC deja de ir con consultoría estratégica y FLOW; se cobra lo que de
-- verdad cuesta hacerla, en tres pagos separados:
--
--   llc-estructura      Creación + EIN               $1,175 -> $597
--   llc-declaracion     Declaración anual ante el IRS NUEVO -> $347 (cada abril)
--   llc-acompanamiento  Mantenimiento anual           $1,175 -> $397 (cada agosto:
--                       agente registrado + informe anual de Wyoming)
--
-- Idempotente.

do $$ begin
  if to_regclass('public.products') is null then
    raise exception 'Proyecto equivocado: aqui no esta la tabla products. Esto va en el Supabase de la landing de HGG.';
  end if;
end $$;

update products
   set base_price = 597, tag = 'Creación + EIN', title = 'LLC en EE. UU. — Creación + EIN',
       unit = 'USD', recurring = false, active = true, updated_at = now()
 where id = 'llc-estructura';

update products
   set base_price = 397, tag = 'Mantenimiento anual', title = 'LLC en EE. UU. — Mantenimiento anual',
       unit = 'USD / año', recurring = true, active = true, updated_at = now()
 where id = 'llc-acompanamiento';

insert into products (id, category, category_label, tag, title, base_price, unit, recurring, highlight, active, sort_order)
values ('llc-declaracion', 'llc', 'Estructuración Empresarial', 'Declaración anual', 'LLC en EE. UU. — Declaración anual IRS', 347, 'USD / año', true, false, true, 52)
on conflict (id) do update
   set base_price = excluded.base_price, tag = excluded.tag, title = excluded.title,
       unit = excluded.unit, recurring = excluded.recurring, active = true, updated_at = now();

-- Esperado: llc-estructura 597 · llc-acompanamiento 397 · llc-declaracion 347; todos activos.
select id, title, base_price, active
  from products
 where category = 'llc'
 order by sort_order;
