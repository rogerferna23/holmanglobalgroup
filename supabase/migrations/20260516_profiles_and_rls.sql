-- ============================================
-- MIGRACION: profiles + RLS policies
-- Ejecutar UNA SOLA VEZ en Supabase SQL Editor
-- ============================================
--
-- Esta migracion:
-- 1) Crea la tabla `profiles` que vincula auth.users con roles (super/admin/vendor)
-- 2) Crea trigger que auto-llena `profiles` cuando se crea un user en auth.users
-- 3) Activa RLS estricto en TODAS las tablas existentes
-- 4) Anade policies que solo permiten acceso a admins autenticados
-- 5) La tabla profiles tambien tiene RLS — solo super_admin puede ver/modificar otros profiles
--
-- IMPORTANTE: las tablas existentes (manual_sales, expenses, vendors, audit_log,
-- approval_requests, admin_users, admin_sessions) NO SE TOCAN en estructura.
-- Solo se les anaden las policies RLS.

-- =====================================================================
-- 1. TABLA profiles (nueva)
-- =====================================================================
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  name       text,
  role       text not null default 'admin' check (role in ('super', 'admin', 'vendor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on profiles (email);
create index if not exists profiles_role_idx on profiles (role);

-- Trigger: auto-crear profile cuando se crea un user en auth.users
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- 2. HELPER: funcion para chequear si el usuario es admin
-- =====================================================================
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('super', 'admin', 'vendor')
  );
$$;

create or replace function is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'super'
  );
$$;

-- =====================================================================
-- 3. RLS para profiles
-- =====================================================================
alter table profiles enable row level security;

-- Cada usuario ve SU PROPIO profile
drop policy if exists "profiles_self_read" on profiles;
create policy "profiles_self_read" on profiles
  for select using (auth.uid() = id);

-- Super admin ve todos los profiles
drop policy if exists "profiles_super_read_all" on profiles;
create policy "profiles_super_read_all" on profiles
  for select using (is_super_admin());

-- Admin/vendor lee otros profiles tambien (necesario para "Administradores" en Configuracion)
drop policy if exists "profiles_admin_read" on profiles;
create policy "profiles_admin_read" on profiles
  for select using (is_admin());

-- Solo super admin puede insertar/actualizar/eliminar otros profiles
drop policy if exists "profiles_super_write" on profiles;
create policy "profiles_super_write" on profiles
  for all using (is_super_admin()) with check (is_super_admin());

-- Cada usuario puede actualizar SU PROPIO profile (nombre, etc)
drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- =====================================================================
-- 4. RLS para tablas operacionales (manual_sales, expenses, vendors)
-- =====================================================================
-- Cualquier admin autenticado puede operar. RLS hace todo el trabajo de seguridad.

-- manual_sales
alter table manual_sales enable row level security;
drop policy if exists "manual_sales_admin_all" on manual_sales;
create policy "manual_sales_admin_all" on manual_sales
  for all using (is_admin()) with check (is_admin());
-- IMPORTANTE: las Edge Functions usan service_role que bypassa RLS, asi
-- que pueden insertar ventas de Stripe sin policy adicional.

-- expenses
alter table expenses enable row level security;
drop policy if exists "expenses_admin_all" on expenses;
create policy "expenses_admin_all" on expenses
  for all using (is_admin()) with check (is_admin());

-- vendors
alter table vendors enable row level security;
drop policy if exists "vendors_admin_all" on vendors;
create policy "vendors_admin_all" on vendors
  for all using (is_admin()) with check (is_admin());

-- approval_requests
alter table approval_requests enable row level security;
drop policy if exists "approval_requests_admin_all" on approval_requests;
create policy "approval_requests_admin_all" on approval_requests
  for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- 5. RLS para audit_log
-- =====================================================================
-- Solo super admin puede LEER. Insercion la hace service_role desde Edge Functions.
alter table audit_log enable row level security;
drop policy if exists "audit_log_super_read" on audit_log;
create policy "audit_log_super_read" on audit_log
  for select using (is_super_admin());

-- =====================================================================
-- 6. Tablas legado (admin_users, admin_sessions)
-- =====================================================================
-- Las dejamos con RLS activo pero sin policies de acceso publico.
-- Solo service_role las toca si es necesario.
alter table admin_users enable row level security;
alter table admin_sessions enable row level security;
-- No anadimos policies = nadie puede acceder via anon/authenticated.

-- =====================================================================
-- 7. SETUP INICIAL: crear tu usuario super admin
-- =====================================================================
-- DESPUES de correr esta migracion, debes:
--
-- A) Crear tu usuario en Supabase Dashboard -> Authentication -> Users -> Add user
--    Email: tu@email.com
--    Password: la que quieras
--    Marca "Auto Confirm User" para saltar verificacion email
--
-- B) Asignarte rol 'super' ejecutando este SQL:
--    update profiles set role = 'super' where email = 'tu@email.com';
--
-- C) Verificar:
--    select * from profiles where email = 'tu@email.com';
--    -> debe mostrar role = 'super'

-- =====================================================================
-- VERIFICACION FINAL
-- =====================================================================
select
  table_name,
  row_security
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'manual_sales', 'expenses', 'vendors', 'audit_log', 'approval_requests', 'admin_users', 'admin_sessions')
order by table_name;
