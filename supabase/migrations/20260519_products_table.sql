-- ============================================
-- MIGRACION: tabla products como fuente unica de verdad
-- Ejecutar UNA SOLA VEZ DESPUES de 20260518_security_hardening.
-- ============================================
--
-- Elimina la dependencia de PRODUCTS_JSON env var. Las edge functions
-- ahora consultan esta tabla via service_role (bypass RLS).
--
-- RLS: staff lee; admin escribe.

create table if not exists products (
  id            text primary key,
  category      text not null,
  category_label text not null,
  tag           text,
  title         text not null,
  base_price    numeric(12, 2) not null default 0,
  unit          text,
  recurring     boolean not null default false,
  highlight     boolean not null default false,
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on products (category);
create index if not exists products_active_idx on products (active);

alter table products enable row level security;

drop policy if exists "products_staff_read" on products;
create policy "products_staff_read" on products
  for select using (is_staff());

drop policy if exists "products_admin_write" on products;
create policy "products_admin_write" on products
  for insert with check (is_admin());

drop policy if exists "products_admin_update" on products;
create policy "products_admin_update" on products
  for update using (is_admin()) with check (is_admin());

drop policy if exists "products_admin_delete" on products;
create policy "products_admin_delete" on products
  for delete using (is_admin());

-- Lectura publica para el catalogo del frontend (NO auth requerido).
-- Solo expone productos activos via vista materializada — pero simple:
-- damos SELECT a anon para columnas seguras.
drop policy if exists "products_public_read" on products;
create policy "products_public_read" on products
  for select to anon using (active = true);

-- =====================================================================
-- audit_log: permitir lectura tambien a admin (no solo super)
-- =====================================================================
drop policy if exists "audit_log_admin_read" on audit_log;
create policy "audit_log_admin_read" on audit_log
  for select using (is_admin());

-- =====================================================================
-- SEED inicial (sincronizado con src/lib/admin-products.ts)
-- =====================================================================
insert into products (id, category, category_label, tag, title, base_price, unit, recurring, highlight, sort_order) values
  ('test-1usd',              'coaching', 'Prueba',                     'Test',        'Producto de prueba (no comprar)',   1,    'USD',        false, false,  0),
  ('coaching-individual',    'coaching', 'Coaching',                   'Individual',  'Sesión Individual',                 50,   'USD',        false, false, 10),
  ('coaching-3',             'coaching', 'Coaching',                   '3 sesiones',  'Paquete 3 Sesiones',                140,  'USD',        false, false, 11),
  ('coaching-5',             'coaching', 'Coaching',                   '5 sesiones',  'Paquete 5 Sesiones',                210,  'USD',        false, false, 12),
  ('marca-esencial',         'marca',    'Construcción de Marca',      'Esencial',    'Tu Marca con Huella',               350,  'USD',        false, false, 20),
  ('marca-pro',              'marca',    'Construcción de Marca',      'PRO',         'Tu Marca con Huella PRO',           870,  'USD',        false, false, 21),
  ('marca-360',              'marca',    'Construcción de Marca',      '360',         'Tu Marca con Huella 360',           1900, 'USD',        false, true,  22),
  ('llc-estructura',         'llc',      'Estructuración Empresarial', 'Estructura',  'Estructura Global',                 1175, 'USD',        false, false, 30),
  ('llc-acompanamiento',     'llc',      'Estructuración Empresarial', 'Anual',       'Acompañamiento Estratégico LLC',    1175, 'USD / año',  true,  false, 31),
  ('impulso-starter',        'impulso',  'Impulso Digital 360',        'Starter',     'Impulso 360 Starter',               770,  'USD / mes',  true,  false, 40),
  ('impulso-pro',            'impulso',  'Impulso Digital 360',        'PRO',         'Impulso 360 PRO',                   1497, 'USD / mes',  true,  false, 41),
  ('impulso-elite',          'impulso',  'Impulso Digital 360',        'Elite',       'Impulso 360 Elite',                 2197, 'USD / mes',  true,  true,  42),
  ('ia-sistemas',            'ia',       'Inteligencia Artificial',    'A medida',    'Sistemas con IA',                   0,    'Cotización', false, false, 50)
on conflict (id) do update set
  category       = excluded.category,
  category_label = excluded.category_label,
  tag            = excluded.tag,
  title          = excluded.title,
  base_price     = excluded.base_price,
  unit           = excluded.unit,
  recurring      = excluded.recurring,
  highlight      = excluded.highlight,
  sort_order     = excluded.sort_order,
  updated_at     = now();

-- Trigger para updated_at automatico
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();
