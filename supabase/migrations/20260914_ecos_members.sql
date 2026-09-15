-- ============================================
-- MIGRACION: ECOS Business Club — miembros
-- ============================================
--
-- Contexto: el sistema de usuarios actual se diseno para un panel cerrado de
-- administradores. El trigger handle_new_user asigna rol 'admin' por defecto,
-- lo cual es correcto mientras los usuarios se crean a mano desde el Dashboard
-- de Supabase, pero deja de serlo en el momento en que se abre registro publico
-- para los miembros de ECOS: cada miembro entraria con acceso a manual_sales,
-- expenses, vendors y approval_requests.
--
-- Esta migracion:
-- 1) Anade el rol 'member' y lo vuelve el DEFAULT del registro publico
-- 2) Deja is_admin() intacta — 'member' queda fuera del circulo de admins
-- 3) Crea ecos_members (estado de la suscripcion, precio fundador, referidos)
-- 4) Crea ecos_library (contenido con desbloqueo por permanencia)
-- 5) RLS: cada miembro ve solo lo suyo; los admins ven todo
--
-- Los admins existentes NO se tocan: la migracion solo cambia el default para
-- usuarios NUEVOS. Quien ya tiene rol 'super'/'admin'/'vendor' lo conserva.

-- =====================================================================
-- 1. ROL 'member'
-- =====================================================================
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('super', 'admin', 'vendor', 'member'));

-- El default del registro publico pasa a ser 'member'.
-- Para crear un admin nuevo desde el Dashboard de Supabase hay que pasar
-- {"role": "admin"} en raw_user_meta_data, o corregirlo despues con:
--   update profiles set role = 'admin' where email = '...';
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
    coalesce(new.raw_user_meta_data->>'role', 'member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- is_admin() e is_super_admin() se quedan como estan: 'member' no aparece en
-- ninguna de las dos, asi que un miembro no alcanza ninguna tabla operacional.

-- =====================================================================
-- 2. TABLA ecos_members
-- =====================================================================
create table if not exists ecos_members (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text not null unique,
  name                   text,
  status                 text not null default 'pendiente'
                           check (status in ('pendiente', 'activo', 'pausado', 'cancelado')),

  -- Precio que paga ESTE miembro. El fundador conserva su precio mientras siga
  -- activo, aunque el precio de lista suba. Ver founder.
  price_usd              numeric(8, 2) not null default 47.00,
  founder                boolean not null default false,

  -- Fechas
  started_at             timestamptz,
  current_period_end     timestamptz,
  cancelled_at           timestamptz,

  -- Stripe
  stripe_customer_id     text,
  stripe_subscription_id text unique,

  -- Referidos: quien lo trajo. Un solo nivel de profundidad, a proposito —
  -- se gana por quien uno trae, nunca por lo que traigan ellos.
  referred_by            uuid references auth.users(id) on delete set null,
  free_months_earned     integer not null default 0,
  free_months_used       integer not null default 0,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists ecos_members_status_idx on ecos_members (status);
create index if not exists ecos_members_email_idx on ecos_members (email);
create index if not exists ecos_members_referred_by_idx on ecos_members (referred_by);
create index if not exists ecos_members_subscription_idx on ecos_members (stripe_subscription_id);

-- =====================================================================
-- 3. MESES ACTIVOS — la base del desbloqueo por permanencia
-- =====================================================================
create or replace function ecos_months_active(member_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    floor(extract(epoch from (now() - m.started_at)) / 2592000)::integer,
    0
  )
  from ecos_members m
  where m.id = member_id and m.status = 'activo';
$$;

create or replace function is_ecos_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from ecos_members
    where id = auth.uid() and status = 'activo'
  );
$$;

-- =====================================================================
-- 4. BIBLIOTECA con desbloqueo por permanencia
-- =====================================================================
-- unlock_month: 0 = disponible al entrar, 3 = a los tres meses, 6 = a los seis.
create table if not exists ecos_library (
  id           text primary key,
  title        text not null,
  description  text,
  kind         text not null default 'curso'
                 check (kind in ('curso', 'grabacion', 'recurso')),
  url          text,
  cover_url    text,
  unlock_month integer not null default 0,
  published    boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists ecos_library_unlock_idx on ecos_library (unlock_month);
create index if not exists ecos_library_published_idx on ecos_library (published);

-- =====================================================================
-- 5. RLS
-- =====================================================================
alter table ecos_members enable row level security;

-- Cada miembro ve y actualiza SOLO su propia ficha (nombre, nada mas).
-- El estado y el precio los escribe la Edge Function con service_role al
-- recibir el webhook de Stripe — nunca el navegador.
drop policy if exists "ecos_members_self_read" on ecos_members;
create policy "ecos_members_self_read" on ecos_members
  for select using (auth.uid() = id);

drop policy if exists "ecos_members_admin_all" on ecos_members;
create policy "ecos_members_admin_all" on ecos_members
  for all using (is_admin()) with check (is_admin());

alter table ecos_library enable row level security;

-- Un miembro activo ve lo publicado que ya desbloqueo por permanencia.
drop policy if exists "ecos_library_member_read" on ecos_library;
create policy "ecos_library_member_read" on ecos_library
  for select using (
    published
    and is_ecos_member()
    and unlock_month <= ecos_months_active(auth.uid())
  );

drop policy if exists "ecos_library_admin_all" on ecos_library;
create policy "ecos_library_admin_all" on ecos_library
  for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- 6. updated_at automatico
-- =====================================================================
create or replace function ecos_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ecos_members_touch on ecos_members;
create trigger ecos_members_touch
  before update on ecos_members
  for each row execute function ecos_touch_updated_at();

-- =====================================================================
-- VERIFICACION
-- =====================================================================
-- Revisa que ningun usuario existente haya cambiado de rol:
--   select email, role from profiles order by role;
-- Y que las tablas nuevas quedaron con RLS activo:
select c.relname as tabla, c.relrowsecurity as rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('ecos_members', 'ecos_library');
