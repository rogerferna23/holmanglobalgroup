-- ============================================
-- MIGRACION: catalogo de productos — Brief HGG (jul 2026)
-- Ejecutar DESPUES de 20260519_products_table.
-- ============================================
--
-- Reajusta TODOS los productos a los precios exactos del brief y añade los
-- dos productos nuevos de Nexco. La tabla `products` es la fuente de verdad
-- del IMPORTE que se cobra (la edge function create-payment-intent lee
-- base_price por id), por eso debe coincidir con lo que muestra la tienda
-- (src/components/tienda.tsx) y src/lib/admin-products.ts.
--
-- Cambios de precio vs. estado anterior:
--   marca-360  (Elite)  2997 -> 3000
--   impulso-elite       2697 -> 3000
--   nexco-config  NUEVO       -> 300
--   nexco-redes   NUEVO       -> 600
-- (Los demas ya estaban en su precio de brief; se reafirman aqui.)

insert into products (id, category, category_label, tag, title, base_price, unit, recurring, highlight, active, sort_order) values
  ('test-1usd',           'coaching', 'Prueba',                     'Test',                    'Producto de prueba (no comprar)',    1,    'USD',        false, false, true,  0),
  -- Coaching (Eco · Propósito) — 1 color HGG
  ('coaching-individual', 'coaching', 'Coaching',                   'Individual',              'Sesión Individual',                  150,  'USD',        false, false, true, 10),
  ('coaching-5',          'coaching', 'Coaching',                   '5 sesiones',              'Paquete 5 Sesiones',                 597,  'USD',        false, false, true, 12),
  ('coaching-10',         'coaching', 'Coaching',                   '10 sesiones',             'Paquete 10 Sesiones',                1097, 'USD',        false, false, true, 13),
  -- Marca con Huella (Fuego · Marca)
  ('marca-esencial',      'marca',    'Marca con Huella',           'Starter',                 'Marca con Huella Starter',           797,  'USD',        false, false, true, 20),
  ('marca-pro',           'marca',    'Marca con Huella',           'PRO',                     'Marca con Huella PRO',               1597, 'USD',        false, false, true, 21),
  ('marca-360',           'marca',    'Marca con Huella',           'Elite',                   'Marca con Huella Elite',             3000, 'USD',        false, false, true, 22),
  -- Sitios Web y Sistemas Digitales (Huella · Sistema) — color Delegaweb
  ('web-landing',         'web',      'Sitios Web',                 'Landing Page',            'Landing Page',                       648,  'USD',        false, false, true, 30),
  ('web-panel',           'web',      'Sitios Web',                 'Panel de Administración', 'Panel de Administración',            1080, 'USD',        false, false, true, 31),
  ('web-ecommerce',       'web',      'Sitios Web',                 'Ecommerce Completo',      'Ecommerce Completo',                 2160, 'USD',        false, false, true, 32),
  -- Sistema 360 (Huella · Sistema) — 3 colores HGG + Delegaweb + Nexco
  ('impulso-starter',     'impulso',  'Sistema 360',                'Starter',                 'Sistema 360 Starter',                997,  'USD / mes',  true,  false, true, 40),
  ('impulso-pro',         'impulso',  'Sistema 360',                'PRO',                     'Sistema 360 PRO',                    1797, 'USD / mes',  true,  false, true, 41),
  ('impulso-elite',       'impulso',  'Sistema 360',                'Elite',                   'Sistema 360 Elite',                  3000, 'USD / mes',  true,  true,  true, 42),
  -- Estructuración Empresarial (LLC) — 1 color HGG
  ('llc-estructura',      'llc',      'Estructuración Empresarial', 'Creación y Estrategia',   'LLC Global — Creación y Estrategia', 1175, 'USD',        false, false, true, 50),
  ('llc-acompanamiento',  'llc',      'Estructuración Empresarial', 'Renovación Anual',        'LLC Global — Renovación Anual',      1175, 'USD / año',  true,  false, true, 51),
  -- Sistemas con IA — color Delegaweb (cotización a medida, sin cobro directo)
  ('ia-sistemas',         'ia',       'Inteligencia Artificial',    'A medida',                'Sistemas con IA',                    0,    'Cotización', false, false, true, 60),
  -- Nexco — color Nexco #CB9339
  ('nexco-config',        'nexco',    'Nexco',                      'Configuración de Campaña','Configuración de Campaña',           300,  'USD',        false, false, true, 70),
  ('nexco-redes',         'nexco',    'Nexco',                      'Gestión de Redes Sociales','Gestión de Redes Sociales',         600,  'USD / mes',  true,  false, true, 71)
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

-- Producto descontinuado (ya no aparece en el brief): desactivar, no borrar,
-- para preservar el historial de transacciones que lo referencien.
update products set active = false, updated_at = now() where id = 'coaching-3';
