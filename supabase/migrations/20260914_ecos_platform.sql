-- ============================================
-- MIGRACION: ECOS Business Club — plataforma
-- Ejecutar DESPUES de 20260914_ecos_members.sql
-- ============================================
--
-- 1) Cierra un hueco del trigger de registro: el rol NUNCA sale del metadata
--    que manda el navegador. Antes, quien llamara a auth.signUp con
--    {role: 'super'} en el metadata se creaba a si mismo como super admin.
-- 2) Referidos: codigo por miembro, quien lo trajo, y si ya se acredito el
--    mes gratis a quien lo refirio.
-- 3) Calendario de sesiones (martes clase / viernes practica / masterclass).
-- 4) Ajustes del club (link de Zoom, passcode del mes, reto del mes).
-- 5) Catalogo de biblioteca visible completo (sin url) para pintar lo que
--    falta por desbloquear.
-- 6) Invitados a la masterclass (embudo) y registro de eventos del webhook.

-- =====================================================================
-- 1. El rol no viene del navegador
-- =====================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Todo usuario nuevo nace como 'member'. Los admins se promueven a mano
  -- por un super admin: update profiles set role = 'admin' where email = ...
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =====================================================================
-- 2. Referidos
-- =====================================================================
alter table ecos_members
  add column if not exists referral_code     text unique,
  add column if not exists referral_credited boolean not null default false;

-- Codigo corto y legible a partir del id. Sin ceros ni oes para que se dicte
-- por telefono sin confusion. md5() es nativo de Postgres: sin extensiones.
create or replace function ecos_make_referral_code(seed uuid)
returns text
language sql
immutable
as $$
  select upper(
    translate(
      substr(encode(decode(md5(seed::text), 'hex'), 'base64'), 1, 8),
      '0O1lI+/=', 'ABCDEFGH'
    )
  );
$$;

create or replace function ecos_members_set_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null then
    new.referral_code := ecos_make_referral_code(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists ecos_members_referral_code on ecos_members;
create trigger ecos_members_referral_code
  before insert on ecos_members
  for each row execute function ecos_members_set_referral_code();

-- Un usuario autenticado puede crear SU PROPIA ficha en estado 'pendiente'
-- (la Edge Function de checkout tambien la crea; esto cubre el caso de quien
-- crea cuenta y todavia no paga, para que el panel le explique que falta).
drop policy if exists "ecos_members_self_insert" on ecos_members;
create policy "ecos_members_self_insert" on ecos_members
  for insert with check (
    auth.uid() = id
    and status = 'pendiente'
    and stripe_subscription_id is null
  );

-- Resolver un codigo de referido a un id sin exponer la tabla.
create or replace function ecos_resolve_referral(code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from ecos_members
  where referral_code = upper(trim(code)) and status = 'activo'
  limit 1;
$$;

-- Estadisticas propias del miembro (para el panel).
create or replace function ecos_my_stats()
returns table (
  months_active     integer,
  referrals_total   integer,
  referrals_active  integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    ecos_months_active(auth.uid()),
    (select count(*)::integer from ecos_members r where r.referred_by = auth.uid()),
    (select count(*)::integer from ecos_members r where r.referred_by = auth.uid() and r.status = 'activo');
$$;

-- =====================================================================
-- 3. Calendario
-- =====================================================================
create table if not exists ecos_sessions (
  id             text primary key,
  starts_at      timestamptz not null,
  kind           text not null check (kind in ('clase', 'practica', 'masterclass', 'mesa')),
  subject        text not null default 'abierta'
                   check (subject in ('ventas', 'marketing', 'oratoria', 'abierta')),
  title          text not null,
  teacher        text,
  description    text,
  -- Si es null se usa el zoom_url de ecos_settings.
  zoom_url       text,
  -- Grabacion ya subida a la biblioteca (kind = 'grabacion').
  recording_id   text references ecos_library(id) on delete set null,
  open_to_guests boolean not null default false,
  published      boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists ecos_sessions_starts_idx on ecos_sessions (starts_at);
create index if not exists ecos_sessions_published_idx on ecos_sessions (published);

alter table ecos_sessions enable row level security;

drop policy if exists "ecos_sessions_member_read" on ecos_sessions;
create policy "ecos_sessions_member_read" on ecos_sessions
  for select using (published and is_ecos_member());

drop policy if exists "ecos_sessions_admin_all" on ecos_sessions;
create policy "ecos_sessions_admin_all" on ecos_sessions
  for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- 4. Ajustes del club
-- =====================================================================
create table if not exists ecos_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

insert into ecos_settings (key, value) values
  ('zoom_url',       ''),
  ('zoom_passcode',  ''),
  ('reto_titulo',    'Tu oferta en 90 segundos'),
  ('reto_desc',      'Este mes: decir qué haces, para quién y por qué vale — sin titubear.'),
  ('horario',        'Martes y viernes · 7:00 pm (hora del Este)')
on conflict (key) do nothing;

alter table ecos_settings enable row level security;

drop policy if exists "ecos_settings_member_read" on ecos_settings;
create policy "ecos_settings_member_read" on ecos_settings
  for select using (is_ecos_member());

drop policy if exists "ecos_settings_admin_all" on ecos_settings;
create policy "ecos_settings_admin_all" on ecos_settings
  for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- 5. Catalogo de biblioteca sin url
-- =====================================================================
-- La policy de ecos_library solo devuelve lo desbloqueado. Para pintar "a los
-- 3 meses desbloqueas X" hace falta ver el resto — sin el enlace.
create or replace function ecos_library_catalog()
returns table (
  id           text,
  title        text,
  description  text,
  kind         text,
  cover_url    text,
  unlock_month integer,
  sort_order   integer
)
language sql
security definer
set search_path = public
stable
as $$
  select id, title, description, kind, cover_url, unlock_month, sort_order
  from ecos_library
  where published and is_ecos_member()
  order by unlock_month, sort_order, title;
$$;

-- =====================================================================
-- 6. Invitados a la masterclass + eventos del webhook
-- =====================================================================
create table if not exists ecos_guests (
  id          bigserial primary key,
  session_id  text references ecos_sessions(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  invited_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists ecos_guests_session_idx on ecos_guests (session_id);

alter table ecos_guests enable row level security;

-- Cualquiera puede registrarse como invitado (es el embudo). Nadie lee desde
-- el navegador salvo admins.
drop policy if exists "ecos_guests_public_insert" on ecos_guests;
create policy "ecos_guests_public_insert" on ecos_guests
  for insert to anon, authenticated with check (true);

drop policy if exists "ecos_guests_admin_read" on ecos_guests;
create policy "ecos_guests_admin_read" on ecos_guests
  for select using (is_admin());

-- Idempotencia del webhook de Stripe: cada evento se procesa una sola vez.
create table if not exists ecos_webhook_events (
  id         text primary key,
  type       text not null,
  created_at timestamptz not null default now()
);
alter table ecos_webhook_events enable row level security;
-- Sin policies: solo service_role (las Edge Functions) la toca.

-- =====================================================================
-- VERIFICACION
-- =====================================================================
select c.relname as tabla, c.relrowsecurity as rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('ecos_members', 'ecos_library', 'ecos_sessions', 'ecos_settings', 'ecos_guests', 'ecos_webhook_events')
order by c.relname;
