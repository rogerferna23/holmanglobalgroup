-- ---------- 20260914_ecos_members.sql ----------

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


-- ---------- 20260914_ecos_platform.sql ----------

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


-- ---------- 20260915_ecos_rpg.sql ----------

-- ============================================
-- MIGRACION: ECOS — perfil, plan anual, modo RPG, comunidad, invitados, pagos
-- Ejecutar DESPUES de 20260914_ecos_platform.sql
-- ============================================
--
-- Especificacion: https://claude.ai/code/artifact/1aff63f2-ac86-48e0-82f1-4ddf6f14aa6e
--
-- 1) Perfil del miembro: WhatsApp, ciudad, pais, negocio, meta, directorio, plan,
--    y desde cuando esta inactivo (gracia de 14 dias).
-- 2) Modo RPG: eventos de XP, asistencia, retos, insignias, vistos. El XP solo
--    lo escriben funciones del servidor (el navegador no se auto-premia).
-- 3) Comunidad: directorio de miembros activos que eligieron aparecer.
-- 4) Invitados: WhatsApp, asistio, si termino entrando.
-- 5) Pagos: cada factura pagada de Stripe, para el reparto historico real.
-- 6) Biblioteca: lecciones dentro de un curso, video de Bunny, habilidad.
-- 7) Sesiones: ya no existe la "mesa".

-- =====================================================================
-- 1. Perfil y plan
-- =====================================================================
alter table ecos_members
  add column if not exists whatsapp          text,
  add column if not exists city              text,
  add column if not exists country           text,
  add column if not exists business          text,
  add column if not exists goal              text,
  add column if not exists show_in_directory boolean not null default true,
  add column if not exists plan              text not null default 'mensual'
                                             check (plan in ('mensual', 'anual')),
  -- Se fija cuando deja de estar activo; se limpia al volver. Si al volver han
  -- pasado mas de 14 dias, el avance se borra (ecos_apply_grace).
  add column if not exists inactive_since    timestamptz;

-- El miembro puede editar SOLO su perfil. Un trigger impide que toque el
-- estado, el precio, el plan, las fechas o Stripe.
drop policy if exists "ecos_members_self_update" on ecos_members;
create policy "ecos_members_self_update" on ecos_members
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function ecos_members_guard_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (Edge Functions) y admins pueden todo.
  if auth.role() = 'service_role' or is_admin() then
    return new;
  end if;
  -- Un miembro solo cambia lo suyo de perfil.
  new.email                  := old.email;
  new.status                 := old.status;
  new.price_usd              := old.price_usd;
  new.founder                := old.founder;
  new.plan                   := old.plan;
  new.started_at             := old.started_at;
  new.current_period_end     := old.current_period_end;
  new.cancelled_at           := old.cancelled_at;
  new.inactive_since         := old.inactive_since;
  new.stripe_customer_id     := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.referred_by            := old.referred_by;
  new.referral_code          := old.referral_code;
  new.referral_credited      := old.referral_credited;
  new.free_months_earned     := old.free_months_earned;
  new.free_months_used       := old.free_months_used;
  return new;
end;
$$;

drop trigger if exists ecos_members_guard on ecos_members;
create trigger ecos_members_guard
  before update on ecos_members
  for each row execute function ecos_members_guard_self_update();

-- =====================================================================
-- 2. Modo RPG
-- =====================================================================
create table if not exists ecos_xp_events (
  id          bigserial primary key,
  member_id   uuid not null references auth.users(id) on delete cascade,
  skill       text not null check (skill in ('ventas', 'marketing', 'oratoria')),
  points      integer not null,
  reason      text not null check (reason in ('clase','practica','masterclass','invitado','reto','visto','referido','bonus')),
  session_id  text references ecos_sessions(id) on delete set null,
  library_id  text references ecos_library(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists ecos_xp_member_idx on ecos_xp_events (member_id, skill);

create table if not exists ecos_attendance (
  member_id   uuid not null references auth.users(id) on delete cascade,
  session_id  text not null references ecos_sessions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (member_id, session_id)
);

create table if not exists ecos_retos (
  id          text primary key,
  month       date not null,                 -- primer dia del mes
  skill       text not null check (skill in ('ventas', 'marketing', 'oratoria')),
  title       text not null,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists ecos_retos_month_idx on ecos_retos (month desc);

create table if not exists ecos_reto_done (
  member_id   uuid not null references auth.users(id) on delete cascade,
  reto_id     text not null references ecos_retos(id) on delete cascade,
  marked_by   text not null default 'member' check (marked_by in ('member', 'admin')),
  created_at  timestamptz not null default now(),
  primary key (member_id, reto_id)
);

create table if not exists ecos_badges (
  member_id   uuid not null references auth.users(id) on delete cascade,
  badge       text not null,
  created_at  timestamptz not null default now(),
  primary key (member_id, badge)
);

create table if not exists ecos_library_views (
  member_id   uuid not null references auth.users(id) on delete cascade,
  library_id  text not null references ecos_library(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (member_id, library_id)
);

-- RLS: el miembro lee lo suyo; escribe solo a traves de las funciones de abajo.
alter table ecos_xp_events     enable row level security;
alter table ecos_attendance    enable row level security;
alter table ecos_retos         enable row level security;
alter table ecos_reto_done     enable row level security;
alter table ecos_badges        enable row level security;
alter table ecos_library_views enable row level security;

drop policy if exists "xp_self_read"      on ecos_xp_events;     create policy "xp_self_read"      on ecos_xp_events     for select using (auth.uid() = member_id);
drop policy if exists "xp_admin_all"      on ecos_xp_events;     create policy "xp_admin_all"      on ecos_xp_events     for all using (is_admin()) with check (is_admin());
drop policy if exists "att_self_read"     on ecos_attendance;    create policy "att_self_read"     on ecos_attendance    for select using (auth.uid() = member_id);
drop policy if exists "att_admin_all"     on ecos_attendance;    create policy "att_admin_all"     on ecos_attendance    for all using (is_admin()) with check (is_admin());
drop policy if exists "retos_member_read" on ecos_retos;         create policy "retos_member_read" on ecos_retos         for select using (active and is_ecos_member());
drop policy if exists "retos_admin_all"   on ecos_retos;         create policy "retos_admin_all"   on ecos_retos         for all using (is_admin()) with check (is_admin());
drop policy if exists "rdone_self_read"   on ecos_reto_done;     create policy "rdone_self_read"   on ecos_reto_done     for select using (auth.uid() = member_id);
drop policy if exists "rdone_admin_all"   on ecos_reto_done;     create policy "rdone_admin_all"   on ecos_reto_done     for all using (is_admin()) with check (is_admin());
drop policy if exists "badges_self_read"  on ecos_badges;        create policy "badges_self_read"  on ecos_badges        for select using (auth.uid() = member_id);
drop policy if exists "badges_admin_all"  on ecos_badges;        create policy "badges_admin_all"  on ecos_badges        for all using (is_admin()) with check (is_admin());
drop policy if exists "views_self_read"   on ecos_library_views; create policy "views_self_read"   on ecos_library_views for select using (auth.uid() = member_id);
drop policy if exists "views_admin_all"   on ecos_library_views; create policy "views_admin_all"   on ecos_library_views for all using (is_admin()) with check (is_admin());

-- ---- Puntos por accion (una sola tabla de verdad) ----
create or replace function ecos_xp_for(kind text, subject text)
returns integer
language sql
immutable
as $$
  select case kind
    when 'clase'       then 20
    when 'practica'    then 30
    when 'masterclass' then 10
    else 0
  end;
$$;

-- ---- Nivel a partir del XP: cada 100 XP un nivel ----
create or replace function ecos_level(xp integer)
returns integer
language sql
immutable
as $$ select greatest(1, floor(coalesce(xp, 0) / 100.0)::integer + 1); $$;

-- ---- Insignias: se recalculan tras cada evento ----
create or replace function ecos_refresh_badges(m uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ventas int; v_marketing int; v_oratoria int;
  n_att int; n_retos int; n_ref int; streak int;
begin
  select coalesce(sum(points) filter (where skill = 'ventas'), 0),
         coalesce(sum(points) filter (where skill = 'marketing'), 0),
         coalesce(sum(points) filter (where skill = 'oratoria'), 0)
    into v_ventas, v_marketing, v_oratoria
    from ecos_xp_events where member_id = m;
  select count(*) into n_att from ecos_attendance where member_id = m;
  select count(*) into n_retos from ecos_reto_done where member_id = m;
  select count(*) into n_ref from ecos_members where referred_by = m and status = 'activo';
  streak := ecos_streak_weeks(m);

  if n_att >= 1 then insert into ecos_badges values (m, 'primera_clase') on conflict do nothing; end if;
  if streak >= 4  then insert into ecos_badges values (m, 'racha_4')  on conflict do nothing; end if;
  if streak >= 12 then insert into ecos_badges values (m, 'racha_12') on conflict do nothing; end if;
  if streak >= 26 then insert into ecos_badges values (m, 'racha_26') on conflict do nothing; end if;
  if n_retos >= 3 then insert into ecos_badges values (m, 'tres_retos') on conflict do nothing; end if;
  if greatest(ecos_level(v_ventas), ecos_level(v_marketing), ecos_level(v_oratoria)) >= 5
     then insert into ecos_badges values (m, 'nivel_5') on conflict do nothing; end if;
  if least(ecos_level(v_ventas), ecos_level(v_marketing), ecos_level(v_oratoria)) >= 5
     then insert into ecos_badges values (m, 'nivel_5_x3') on conflict do nothing; end if;
  if greatest(ecos_level(v_ventas), ecos_level(v_marketing), ecos_level(v_oratoria)) >= 10
     then insert into ecos_badges values (m, 'nivel_10') on conflict do nothing; end if;
  if n_ref >= 3 then insert into ecos_badges values (m, 'trajo_3') on conflict do nothing; end if;
  if exists (select 1 from ecos_members where id = m and founder)
     then insert into ecos_badges values (m, 'fundador') on conflict do nothing; end if;
end;
$$;

-- ---- Racha: semanas seguidas con al menos una asistencia, contando la
--      semana actual o, si aun no ha venido esta semana, la anterior ----
create or replace function ecos_streak_weeks(m uuid)
returns integer
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  w date; n int := 0; this_week date := date_trunc('week', now())::date;
begin
  -- Empezar en esta semana si ya asistio; si no, en la anterior.
  if exists (select 1 from ecos_attendance a join ecos_sessions s on s.id = a.session_id
             where a.member_id = m and date_trunc('week', s.starts_at)::date = this_week) then
    w := this_week;
  else
    w := this_week - 7;
  end if;
  loop
    exit when not exists (
      select 1 from ecos_attendance a join ecos_sessions s on s.id = a.session_id
      where a.member_id = m and date_trunc('week', s.starts_at)::date = w);
    n := n + 1; w := w - 7;
  end loop;
  return n;
end;
$$;

-- ---- «Asisti»: desde que empieza la sesion hasta 36 h despues ----
create or replace function ecos_mark_attendance(p_session text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  m uuid := auth.uid(); s ecos_sessions; pts int; sk text;
begin
  if not is_ecos_member() then raise exception 'Solo miembros activos'; end if;
  select * into s from ecos_sessions where id = p_session and published;
  if s.id is null then raise exception 'Sesión no encontrada'; end if;
  if now() < s.starts_at or now() > s.starts_at + interval '36 hours' then
    raise exception 'Esta sesión ya no admite marcar asistencia';
  end if;
  if exists (select 1 from ecos_attendance where member_id = m and session_id = s.id) then
    return json_build_object('ok', true, 'already', true);
  end if;
  insert into ecos_attendance (member_id, session_id) values (m, s.id);
  pts := ecos_xp_for(s.kind, s.subject);
  if s.kind = 'masterclass' then
    insert into ecos_xp_events (member_id, skill, points, reason, session_id)
    values (m, 'ventas', pts, 'masterclass', s.id), (m, 'marketing', pts, 'masterclass', s.id), (m, 'oratoria', pts, 'masterclass', s.id);
  else
    sk := case when s.subject in ('ventas','marketing','oratoria') then s.subject else 'ventas' end;
    insert into ecos_xp_events (member_id, skill, points, reason, session_id) values (m, sk, pts, s.kind, s.id);
  end if;
  perform ecos_refresh_badges(m);
  return json_build_object('ok', true, 'points', pts);
end;
$$;

-- ---- «Visto»: +5 una sola vez por contenido ----
create or replace function ecos_mark_viewed(p_library text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  m uuid := auth.uid(); it ecos_library;
begin
  if not is_ecos_member() then raise exception 'Solo miembros activos'; end if;
  select * into it from ecos_library where id = p_library and published;
  if it.id is null then raise exception 'Contenido no encontrado'; end if;
  if exists (select 1 from ecos_library_views where member_id = m and library_id = it.id) then
    return json_build_object('ok', true, 'already', true);
  end if;
  insert into ecos_library_views (member_id, library_id) values (m, it.id);
  insert into ecos_xp_events (member_id, skill, points, reason, library_id)
  values (m, coalesce(it.skill, 'ventas'), 5, 'visto', it.id);
  perform ecos_refresh_badges(m);
  return json_build_object('ok', true, 'points', 5);
end;
$$;

-- ---- «Presente mi reto»: +50 en la habilidad del reto ----
create or replace function ecos_mark_reto(p_reto text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  m uuid := auth.uid(); r ecos_retos;
begin
  if not is_ecos_member() then raise exception 'Solo miembros activos'; end if;
  select * into r from ecos_retos where id = p_reto and active;
  if r.id is null then raise exception 'Reto no encontrado'; end if;
  if exists (select 1 from ecos_reto_done where member_id = m and reto_id = r.id) then
    return json_build_object('ok', true, 'already', true);
  end if;
  insert into ecos_reto_done (member_id, reto_id, marked_by) values (m, r.id, 'member');
  insert into ecos_xp_events (member_id, skill, points, reason, note) values (m, r.skill, 50, 'reto', r.title);
  perform ecos_refresh_badges(m);
  return json_build_object('ok', true, 'points', 50);
end;
$$;

-- ---- Bonus del admin ----
create or replace function ecos_admin_bonus(p_member uuid, p_skill text, p_points integer, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Solo administradores'; end if;
  insert into ecos_xp_events (member_id, skill, points, reason, note) values (p_member, p_skill, p_points, 'bonus', p_note);
  perform ecos_refresh_badges(p_member);
end;
$$;

-- ---- Mi progreso (para el panel) ----
create or replace function ecos_my_progress()
returns json
language sql
security definer
set search_path = public
stable
as $$
  with xp as (
    select skill, coalesce(sum(points), 0)::int as pts from ecos_xp_events where member_id = auth.uid() group by skill
  )
  select json_build_object(
    'xp', json_build_object(
      'ventas',    coalesce((select pts from xp where skill = 'ventas'), 0),
      'marketing', coalesce((select pts from xp where skill = 'marketing'), 0),
      'oratoria',  coalesce((select pts from xp where skill = 'oratoria'), 0)),
    'streak', ecos_streak_weeks(auth.uid()),
    'badges', coalesce((select json_agg(json_build_object('badge', badge, 'at', created_at) order by created_at) from ecos_badges where member_id = auth.uid()), '[]'::json),
    'attended', coalesce((select json_agg(session_id) from ecos_attendance where member_id = auth.uid()), '[]'::json),
    'retos_done', coalesce((select json_agg(reto_id) from ecos_reto_done where member_id = auth.uid()), '[]'::json),
    'viewed', coalesce((select json_agg(library_id) from ecos_library_views where member_id = auth.uid()), '[]'::json),
    'months_active', ecos_months_active(auth.uid()),
    'referrals_total',  (select count(*)::int from ecos_members r where r.referred_by = auth.uid()),
    'referrals_active', (select count(*)::int from ecos_members r where r.referred_by = auth.uid() and r.status = 'activo')
  );
$$;

-- ---- Gracia de 14 dias: al volver, si paso el plazo, se borra el avance ----
create or replace function ecos_apply_grace(p_member uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare wiped boolean := false; since timestamptz;
begin
  select inactive_since into since from ecos_members where id = p_member;
  if since is not null and since < now() - interval '14 days' then
    delete from ecos_xp_events where member_id = p_member;
    delete from ecos_attendance where member_id = p_member;
    delete from ecos_reto_done where member_id = p_member;
    delete from ecos_badges where member_id = p_member and badge <> 'fundador';
    delete from ecos_library_views where member_id = p_member;
    wiped := true;
  end if;
  update ecos_members set inactive_since = null where id = p_member;
  return wiped;
end;
$$;

-- =====================================================================
-- 3. Comunidad (directorio)
-- =====================================================================
create or replace function ecos_directory()
returns table (
  id uuid, name text, city text, country text, business text,
  level_ventas int, level_marketing int, level_oratoria int, badges text[], since timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select m.id, m.name, m.city, m.country, m.business,
    ecos_level(coalesce((select sum(points)::int from ecos_xp_events x where x.member_id = m.id and x.skill = 'ventas'), 0)),
    ecos_level(coalesce((select sum(points)::int from ecos_xp_events x where x.member_id = m.id and x.skill = 'marketing'), 0)),
    ecos_level(coalesce((select sum(points)::int from ecos_xp_events x where x.member_id = m.id and x.skill = 'oratoria'), 0)),
    coalesce((select array_agg(badge) from ecos_badges b where b.member_id = m.id), '{}'),
    m.started_at
  from ecos_members m
  where m.status = 'activo' and m.show_in_directory and is_ecos_member()
  order by m.started_at desc nulls last;
$$;

-- =====================================================================
-- 4. Invitados
-- =====================================================================
alter table ecos_guests
  add column if not exists whatsapp     text,
  add column if not exists attended     boolean not null default false,
  add column if not exists converted_id uuid references auth.users(id) on delete set null;

drop policy if exists "ecos_guests_admin_all" on ecos_guests;
create policy "ecos_guests_admin_all" on ecos_guests
  for all using (is_admin()) with check (is_admin());

-- Datos minimos de una sesion abierta, para el formulario publico (sin login).
create or replace function ecos_open_session(p_session text)
returns table (id text, title text, starts_at timestamptz, teacher text, description text)
language sql
security definer
set search_path = public
stable
as $$
  select id, title, starts_at, teacher, description
  from ecos_sessions where id = p_session and published and open_to_guests;
$$;

-- Resolver el codigo de quien invita a su id (sin exponer la tabla).
-- ecos_resolve_referral ya existe y sirve.

-- =====================================================================
-- 5. Pagos (para el reparto historico real)
-- =====================================================================
create table if not exists ecos_payments (
  stripe_invoice_id text primary key,
  member_id   uuid references auth.users(id) on delete set null,
  amount_usd  numeric(10, 2) not null,
  plan        text,
  paid_at     timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists ecos_payments_paid_idx on ecos_payments (paid_at desc);
alter table ecos_payments enable row level security;
drop policy if exists "payments_admin_read" on ecos_payments;
create policy "payments_admin_read" on ecos_payments for select using (is_admin());
-- Inserta la Edge Function (service_role).

-- =====================================================================
-- 6. Biblioteca: lecciones, Bunny, habilidad
-- =====================================================================
alter table ecos_library
  add column if not exists parent_id      text references ecos_library(id) on delete cascade,
  add column if not exists bunny_video_id text,
  add column if not exists skill          text check (skill in ('ventas', 'marketing', 'oratoria'));
create index if not exists ecos_library_parent_idx on ecos_library (parent_id);

-- Las lecciones heredan el desbloqueo de su curso.
-- Postgres no deja cambiar las columnas que devuelve una funcion con
-- CREATE OR REPLACE: hay que borrarla primero. Por eso el drop.
drop function if exists ecos_library_catalog();
create or replace function ecos_library_catalog()
returns table (
  id text, title text, description text, kind text, cover_url text,
  unlock_month integer, sort_order integer, parent_id text, skill text
)
language sql
security definer
set search_path = public
stable
as $$
  select id, title, description, kind, cover_url, unlock_month, sort_order, parent_id, skill
  from ecos_library
  where published and is_ecos_member()
  order by unlock_month, sort_order, title;
$$;

drop policy if exists "ecos_library_member_read" on ecos_library;
create policy "ecos_library_member_read" on ecos_library
  for select using (
    published and is_ecos_member()
    and coalesce((select p.unlock_month from ecos_library p where p.id = ecos_library.parent_id), unlock_month)
        <= ecos_months_active(auth.uid())
  );

-- =====================================================================
-- 7. Sesiones: sin "mesa"; ajustes nuevos
-- =====================================================================
update ecos_sessions set kind = 'practica' where kind = 'mesa';
alter table ecos_sessions drop constraint if exists ecos_sessions_kind_check;
alter table ecos_sessions add constraint ecos_sessions_kind_check
  check (kind in ('clase', 'practica', 'masterclass'));

insert into ecos_settings (key, value) values
  ('whatsapp_group_url', ''),
  ('bunny_library_id', '')
on conflict (key) do nothing;

-- Asistentes por sesion (para el admin)
create or replace function ecos_attendance_counts()
returns table (session_id text, n integer)
language sql
security definer
set search_path = public
stable
as $$
  select session_id, count(*)::int from ecos_attendance
  where is_admin()
  group by session_id;
$$;

-- Ranking (para el admin)
create or replace function ecos_ranking()
returns table (id uuid, name text, xp_ventas int, xp_marketing int, xp_oratoria int, streak int, badges int)
language sql
security definer
set search_path = public
stable
as $$
  select m.id, coalesce(m.name, m.email),
    coalesce((select sum(points)::int from ecos_xp_events x where x.member_id = m.id and x.skill = 'ventas'), 0),
    coalesce((select sum(points)::int from ecos_xp_events x where x.member_id = m.id and x.skill = 'marketing'), 0),
    coalesce((select sum(points)::int from ecos_xp_events x where x.member_id = m.id and x.skill = 'oratoria'), 0),
    ecos_streak_weeks(m.id),
    (select count(*)::int from ecos_badges b where b.member_id = m.id)
  from ecos_members m
  where is_admin() and m.status = 'activo'
  order by 3 + 4 + 5 desc;
$$;

-- =====================================================================
-- VERIFICACION
-- =====================================================================
select c.relname as tabla, c.relrowsecurity as rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname like 'ecos_%'
order by c.relname;


-- ---------- 20260915_ecos_cursos.sql ----------

-- ============================================
-- MIGRACION: ECOS — cursos con precio y acceso manual; referidos sin mes gratis
-- Ejecutar DESPUES de 20260915_ecos_rpg.sql
-- ============================================
--
-- Holman decidio (15 sep 2026):
--  - La biblioteca pasa a llamarse "Cursos". Cada curso tiene precio. NO se
--    desbloquea por permanencia: el acceso lo da Holman a mano (o cuando la
--    persona lo compra). Las grabaciones siguen siendo de todos los miembros.
--  - Referidos: se elimina el "mes gratis". El beneficio es 10% de comision
--    si el referido compra un producto de HGG, y todo miembro tiene 10% de
--    descuento en los productos de HGG.

alter table ecos_library add column if not exists price_usd numeric(10, 2);

create table if not exists ecos_course_access (
  member_id  uuid not null references auth.users(id) on delete cascade,
  library_id text not null references ecos_library(id) on delete cascade,
  granted_by text not null default 'admin' check (granted_by in ('admin', 'compra')),
  note       text,
  created_at timestamptz not null default now(),
  primary key (member_id, library_id)
);
alter table ecos_course_access enable row level security;
drop policy if exists "access_self_read" on ecos_course_access;
create policy "access_self_read" on ecos_course_access for select using (auth.uid() = member_id);
drop policy if exists "access_admin_all" on ecos_course_access;
create policy "access_admin_all" on ecos_course_access for all using (is_admin()) with check (is_admin());

-- Un curso es accesible si es gratis (sin precio) o si el miembro tiene acceso.
-- Una leccion hereda el acceso de su curso. Grabaciones y recursos: todos.
create or replace function ecos_can_open(p_library text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with it as (select * from ecos_library where id = p_library),
  course as (select coalesce((select parent_id from it), p_library) as id)
  select case
    when (select kind from it) <> 'curso' then true
    when coalesce((select price_usd from ecos_library where id = (select id from course)), 0) = 0 then true
    else exists (select 1 from ecos_course_access a where a.member_id = auth.uid() and a.library_id = (select id from course))
  end;
$$;

drop policy if exists "ecos_library_member_read" on ecos_library;
create policy "ecos_library_member_read" on ecos_library
  for select using (published and is_ecos_member() and ecos_can_open(id));

-- El catalogo completo (con precio) para pintar lo que no se tiene.
-- Postgres no deja cambiar las columnas que devuelve una funcion con
-- CREATE OR REPLACE: hay que borrarla primero. Por eso el drop.
drop function if exists ecos_library_catalog();
create or replace function ecos_library_catalog()
returns table (
  id text, title text, description text, kind text, cover_url text,
  unlock_month integer, sort_order integer, parent_id text, skill text, price_usd numeric, has_access boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select id, title, description, kind, cover_url, unlock_month, sort_order, parent_id, skill, price_usd, ecos_can_open(id)
  from ecos_library
  where published and is_ecos_member()
  order by sort_order, title;
$$;

insert into ecos_settings (key, value) values ('network_url', '') on conflict (key) do nothing;


-- ---------- 20260916_ecos_cupos.sql ----------

-- ============================================
-- MIGRACION: ECOS — contador público de cupos fundadores
-- Ejecutar DESPUES de 20260915_ecos_cursos.sql
-- ============================================
--
-- La landing es pública y RLS no deja que nadie sin sesión lea ecos_members.
-- Esta función devuelve SOLO el conteo —nunca datos de personas— y se le da
-- permiso a anon para que la página pueda mostrar cuántos lugares quedan.

-- El cupo vive en ajustes para poder cambiarlo sin tocar código.
insert into ecos_settings (key, value) values ('founder_cap', '50')
on conflict (key) do nothing;

create or replace function ecos_founder_spots()
returns json
language sql
security definer
set search_path = public
stable
as $$
  with cap as (
    select coalesce(nullif((select value from ecos_settings where key = 'founder_cap'), ''), '50')::int as n
  ),
  taken as (
    -- Cuentan los que ya pagaron y los que están en el paso del pago: el cupo
    -- se reserva en cuanto alguien entra al checkout, no cuando termina.
    select count(*)::int as n from ecos_members
    where founder and status in ('activo', 'pendiente')
  )
  select json_build_object(
    'cap',   (select n from cap),
    'taken', (select n from taken),
    'left',  greatest(0, (select n from cap) - (select n from taken))
  );
$$;

revoke all on function ecos_founder_spots() from public;
grant execute on function ecos_founder_spots() to anon, authenticated;


-- ---------- verificación ----------

-- 1) Las 14 tablas de ECOS, todas con la seguridad activa (rls = true)
select c.relname as tabla, c.relrowsecurity as rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname like 'ecos_%'
order by c.relname;

-- 2) Quién tiene acceso al panel hoy. Deben salir solo las cuentas del equipo;
--    de aquí en adelante nadie más puede llegar a esta lista por su cuenta.
select p.email, p.role, p.created_at as se_registro, u.last_sign_in_at as ultimo_ingreso
from profiles p
left join auth.users u on u.id = p.id
where p.role in ('super', 'admin', 'vendor')
order by p.created_at;

-- 3) El contador de cupos responde (debe decir cap 50, taken 0, left 50)
select ecos_founder_spots();
