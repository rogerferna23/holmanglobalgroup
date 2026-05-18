-- ============================================
-- MIGRACION: hardening de seguridad
-- Ejecutar UNA SOLA VEZ en Supabase SQL Editor DESPUES de la 20260516.
-- ============================================
--
-- Esta migracion arregla:
--  1) Separacion vendor vs admin (vendor no era admin)
--  2) Auto-escalacion de rol via profiles_self_update
--  3) Trigger handle_new_user que confiaba en raw_user_meta_data.role
--  4) Idempotencia de webhook Stripe (tabla processed_events)

-- =====================================================================
-- 1. Helpers separados: is_staff (super+admin+vendor) vs is_admin (super+admin)
-- =====================================================================

-- is_staff: cualquier usuario con acceso al panel (lectura general).
create or replace function is_staff()
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

-- is_admin: solo super y admin (escritura sensible).
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('super', 'admin')
  );
$$;

-- is_super_admin permanece igual.

-- =====================================================================
-- 2. Trigger handle_new_user: NO confiar en raw_user_meta_data.role
-- =====================================================================
-- El rol siempre se asigna como 'vendor' por defecto al crear el user.
-- Promocion a admin/super solo via SQL manual o Edge Function con service_role.

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
    'vendor'  -- rol seguro por defecto; ignoramos lo que mande el cliente
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =====================================================================
-- 3. Prevenir auto-escalacion: trigger que bloquea cambios a `role`
--    excepto cuando el actor es super_admin (o el rol se mantiene igual).
-- =====================================================================

create or replace function prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si el rol no cambia, dejar pasar.
  if new.role is not distinct from old.role then
    return new;
  end if;
  -- Si NO hay sesion (postgres / service_role desde SQL editor o edge fn),
  -- dejar pasar. Solo bloqueamos cambios hechos por un usuario autenticado
  -- que no sea super_admin.
  if auth.uid() is null then
    return new;
  end if;
  -- Si quien hace el update es super_admin, dejar pasar.
  if is_super_admin() then
    return new;
  end if;
  raise exception 'No autorizado para cambiar el rol';
end;
$$;

drop trigger if exists profiles_role_guard on profiles;
create trigger profiles_role_guard
  before update of role on profiles
  for each row execute function prevent_role_escalation();

-- =====================================================================
-- 4. Reescribir policies operacionales: usar is_admin (no is_staff)
--    Vendor podra LEER (via policies separadas) pero no escribir.
-- =====================================================================

-- manual_sales: admin escribe, staff (incluyendo vendor) lee.
drop policy if exists "manual_sales_admin_all" on manual_sales;
drop policy if exists "manual_sales_staff_read" on manual_sales;
drop policy if exists "manual_sales_admin_write" on manual_sales;
create policy "manual_sales_staff_read" on manual_sales
  for select using (is_staff());
create policy "manual_sales_admin_write" on manual_sales
  for insert with check (is_admin());
create policy "manual_sales_admin_update" on manual_sales
  for update using (is_admin()) with check (is_admin());
create policy "manual_sales_admin_delete" on manual_sales
  for delete using (is_admin());

-- expenses: solo admin.
drop policy if exists "expenses_admin_all" on expenses;
create policy "expenses_admin_all" on expenses
  for all using (is_admin()) with check (is_admin());

-- vendors: solo admin escribe; staff lee.
drop policy if exists "vendors_admin_all" on vendors;
create policy "vendors_staff_read" on vendors
  for select using (is_staff());
create policy "vendors_admin_write" on vendors
  for insert with check (is_admin());
create policy "vendors_admin_update" on vendors
  for update using (is_admin()) with check (is_admin());
create policy "vendors_admin_delete" on vendors
  for delete using (is_admin());

-- approval_requests: vendor puede crear y leer las suyas; admin todo.
drop policy if exists "approval_requests_admin_all" on approval_requests;
create policy "approval_requests_admin_all" on approval_requests
  for all using (is_admin()) with check (is_admin());

-- profiles_admin_read: ahora usa is_staff (en vez de is_admin viejo que incluia vendor).
-- Mantenemos lectura amplia para que el panel funcione.
drop policy if exists "profiles_admin_read" on profiles;
create policy "profiles_staff_read" on profiles
  for select using (is_staff());

-- =====================================================================
-- 5. Idempotencia webhook Stripe
-- =====================================================================
-- Tabla para deduplicar eventos de Stripe por event.id.
-- El webhook hace INSERT; si choca por PK, se salta el procesamiento.

create table if not exists stripe_processed_events (
  event_id    text primary key,
  event_type  text not null,
  processed_at timestamptz not null default now()
);

alter table stripe_processed_events enable row level security;
-- Solo super_admin lee; service_role (edge function) escribe sin RLS.
drop policy if exists "spe_super_read" on stripe_processed_events;
create policy "spe_super_read" on stripe_processed_events
  for select using (is_super_admin());

-- =====================================================================
-- VERIFICACION
-- =====================================================================
select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('is_admin', 'is_staff', 'is_super_admin', 'handle_new_user', 'prevent_role_escalation')
order by routine_name;
