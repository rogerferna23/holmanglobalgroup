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
