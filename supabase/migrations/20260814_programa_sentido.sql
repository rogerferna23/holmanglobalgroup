-- ============================================
-- MIGRACION: Programa Sentido — Brief HGG 13-ago-2026
-- Ejecutar DESPUES de 20260712_products_july_brief y 20260809_delegawork_360_naming.
-- ============================================
--
-- La seccion de Coaching pasa a llamarse "Programa Sentido" y sus tres
-- productos sueltos se sustituyen por tres niveles acumulativos:
--
--   Sesión Individual   $150   -> Programa Sentido Starter   $397  (3 sesiones)
--   Paquete 5 Sesiones  $597   -> Programa Sentido Pro       $747  (6 sesiones)
--   Paquete 10 Sesiones $1.097 -> Programa Sentido Elite     $1.097 (10 sesiones)
--
-- IMPORTANTE: la tabla `products` es la fuente de verdad del IMPORTE que se
-- cobra — la edge function create-payment-intent lee `base_price` por id y
-- exige `active = true`. Si el front se despliega SIN aplicar esto, los tres
-- niveles nuevos no existen en la tabla y el checkout falla con "producto no
-- encontrado". Por eso: primero esta migracion, luego el deploy.
--
-- Es idempotente: se puede ejecutar las veces que haga falta.

-- Paramos si estamos en el proyecto equivocado, antes de tocar nada.
-- (En el Supabase del CRM/DelegaWork no existe `products` de la landing.)
do $$ begin
  if to_regclass('public.products') is null then
    raise exception 'Proyecto equivocado: aqui no esta la tabla products. Esto va en el Supabase de la landing de HGG.';
  end if;
end $$;

-- =====================================================================
-- 1 · Los tres niveles nuevos
-- =====================================================================
insert into products (id, category, category_label, tag, title, base_price, unit, recurring, highlight, active, sort_order) values
  ('sentido-starter', 'coaching', 'Programa Sentido', 'Starter', 'Programa Sentido Starter', 397,  'USD', false, false, true, 10),
  ('sentido-pro',     'coaching', 'Programa Sentido', 'Pro',     'Programa Sentido Pro',     747,  'USD', false, false, true, 11),
  ('sentido-elite',   'coaching', 'Programa Sentido', 'Elite',   'Programa Sentido Elite',   1097, 'USD', false, false, true, 12)
on conflict (id) do update set
  category       = excluded.category,
  category_label = excluded.category_label,
  tag            = excluded.tag,
  title          = excluded.title,
  base_price     = excluded.base_price,
  unit           = excluded.unit,
  recurring      = excluded.recurring,
  highlight      = excluded.highlight,
  active         = excluded.active,
  sort_order     = excluded.sort_order,
  updated_at     = now();

-- =====================================================================
-- 2 · Los tres viejos: desactivar, NO borrar
-- =====================================================================
-- Se quedan en la tabla para que las transacciones ya cobradas sigan
-- resolviendo su producto. `active = false` basta para que la edge function
-- deje de aceptarlos y para que no se puedan volver a comprar.
update products
   set active = false, updated_at = now()
 where id in ('coaching-individual', 'coaching-5', 'coaching-10');

-- =====================================================================
-- VERIFICACION — estas filas tienen que salir asi
-- =====================================================================
select id, title, base_price, active, sort_order
  from products
 where id in (
   'sentido-starter', 'sentido-pro', 'sentido-elite',
   'coaching-individual', 'coaching-5', 'coaching-10'
 )
 order by active desc, sort_order, id;
-- Esperado: los tres 'sentido-*' con active = true y precios 397 / 747 / 1097;
-- los tres 'coaching-*' con active = false.
