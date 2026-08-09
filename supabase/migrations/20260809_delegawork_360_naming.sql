-- ============================================
-- MIGRACION: naming — Brief HGG "Reestructuracion Tienda + DelegaWork 360 +
-- Footer" (ago 2026). Ejecutar DESPUES de 20260712_products_july_brief.
-- ============================================
--
-- SOLO cambia texto. No toca precios, ids, categorias internas ni sort_order,
-- asi que el importe que cobra la edge function create-payment-intent
-- (base_price por id) queda exactamente igual.
--
-- Reglas del brief:
--   1. "Sistema 360"  -> "DelegaWork 360"  (category_label y title)
--   2. "PRO"          -> "Pro"             (tag y title de cualquier tier)
--
-- Debe quedar alineado con src/components/tienda.tsx y src/lib/admin-products.ts.

-- 1 · Sistema 360 -> DelegaWork 360
update products
set category_label = 'DelegaWork 360',
    title          = replace(title, 'Sistema 360', 'DelegaWork 360'),
    updated_at     = now()
where category = 'impulso'
  and (category_label = 'Sistema 360' or title like 'Sistema 360%');

-- 2 · PRO -> Pro (capitalizacion titulo) en cualquier producto
update products
set tag        = 'Pro',
    updated_at = now()
where tag = 'PRO';

update products
set title      = replace(title, ' PRO', ' Pro'),
    updated_at = now()
where title like '% PRO%';
