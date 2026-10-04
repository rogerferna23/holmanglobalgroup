-- Prueba gratis para todos: 14 dias desde que se crea la cuenta.
--
-- Hasta ahora solo los fundadores tenian prueba (octubre gratis, hasta el
-- 1 de noviembre) y, con el cupo lleno o pasada esa fecha, quien se registraba
-- no podia entrar sin pagar. Desde aqui:
--
--   · Mientras haya cupo de fundador y no haya pasado ecos_trial_end(), igual
--     que antes: fundador, gratis hasta esa fecha.
--   · Todos los demas: 14 dias gratis desde que crean la cuenta, sin tarjeta
--     (los dias se cambian en ecos_settings, clave «prueba_dias»).
--   · Una sola prueba por cuenta. Quien ya la uso no recibe otra.
--   · El embajador queda registrado desde el registro (como antes) y cobra su
--     comision cuando la persona paga; en la prueba no hay comision.
--
-- Cada ficha guarda su propia fecha: ecos_members.prueba_hasta.
--
-- Se puede correr mas de una vez.

alter table ecos_members add column if not exists prueba_hasta timestamptz;
comment on column ecos_members.prueba_hasta is
  'Hasta cuando tiene acceso gratis sin activar (prueba de 14 dias). Los fundadores usan ecos_trial_end().';

insert into ecos_settings (key, value) values ('prueba_dias', '14')
on conflict (key) do nothing;

-- 0. El miembro no puede alargarse la prueba ------------------------------
create or replace function ecos_members_guard_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (Edge Functions), admins y las funciones del sistema pueden todo.
  if auth.role() = 'service_role' or is_admin()
     or coalesce(current_setting('ecos.sistema', true), '') = '1' then
    return new;
  end if;
  -- Un miembro solo cambia lo suyo de perfil.
  new.email                  := old.email;
  new.status                 := old.status;
  new.price_usd              := old.price_usd;
  new.founder                := old.founder;
  new.teacher                := old.teacher;
  new.cortesia               := old.cortesia;
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
  new.de_campana             := old.de_campana;
  new.campana                := old.campana;
  new.prueba_hasta           := old.prueba_hasta;
  new.created_at             := old.created_at;
  return new;
end;
$$;

-- 1. Cuantos dias dura la prueba --------------------------------------------
create or replace function ecos_prueba_dias()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select greatest(1, coalesce(nullif(trim((select value from ecos_settings where key = 'prueba_dias')), '')::int, 14));
$$;

-- 2. La regla de la prueba, en un solo lugar ------------------------------
-- Pendiente (no ha activado) y dentro de su fecha: la de fundador o la suya.
create or replace function ecos_en_prueba(p_status text, p_founder boolean, p_prueba_hasta timestamptz)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_status = 'pendiente' and (
    (coalesce(p_founder, false) and now() < ecos_trial_end())
    or (p_prueba_hasta is not null and now() < p_prueba_hasta)
  );
$$;

-- 3. Quien esta dentro del club -------------------------------------------
create or replace function is_ecos_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from ecos_members
    where id = auth.uid()
      and (
        status = 'activo' or teacher or cortesia
        or ecos_en_prueba(status, founder, prueba_hasta)
      )
  );
$$;

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
    coalesce(m.started_at, m.created_at)
  from ecos_members m
  where m.show_in_directory
    and (m.status = 'activo' or m.teacher or m.cortesia or ecos_en_prueba(m.status, m.founder, m.prueba_hasta))
    and is_ecos_member()
  order by coalesce(m.started_at, m.created_at) desc nulls last;
$$;

-- 4. El enlace de quien esta en prueba tambien asocia ----------------------
create or replace function hgg_resolve_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select r.id from hgg_referrers r
  where (lower(r.code) = lower(trim(p_code)) or lower(r.old_code) = lower(trim(p_code)))
    and (
      hgg_referrer_kind(r.id) is not null
      or exists (
        select 1 from ecos_members m
        where m.id = r.id and ecos_en_prueba(m.status, m.founder, m.prueba_hasta)
      )
    )
  order by (lower(r.code) = lower(trim(p_code))) desc
  limit 1;
$$;

-- 5. La inscripcion al registrarse ---------------------------------------
create or replace function ecos_inscribir(p_uid uuid, p_ref text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   auth.users%rowtype;
  v_md     jsonb;
  v_row    ecos_members%rowtype;
  v_cupo   boolean;
  v_ref    uuid;
  v_existe boolean;
  v_hasta  timestamptz;
begin
  if p_uid is null then return; end if;

  -- De a uno: que dos registros al mismo tiempo no se pasen del cupo.
  perform pg_advisory_xact_lock(hashtext('ecos_unirse_prueba'));

  select * into v_row from ecos_members where id = p_uid;
  -- Se guarda YA: un PERFORM posterior pisa FOUND.
  v_existe := found;
  -- Una sola prueba por cuenta: quien ya la tuvo (o ya activo) no recibe otra.
  if v_existe and (v_row.founder or v_row.prueba_hasta is not null or v_row.status <> 'pendiente'
                   or v_row.stripe_subscription_id is not null) then
    return;
  end if;

  -- Fundador mientras haya cupo y no haya pasado la fecha; si no, sus 14 dias.
  v_cupo := now() < ecos_trial_end() and (ecos_founder_spots() ->> 'left')::int > 0;
  v_hasta := case when v_cupo then null else now() + make_interval(days => ecos_prueba_dias()) end;
  perform set_config('ecos.sistema', '1', true);

  if v_existe then
    update ecos_members set founder = v_cupo, prueba_hasta = v_hasta where id = p_uid;
    return;
  end if;

  select * into v_user from auth.users where id = p_uid;
  if not found then return; end if;
  v_md := coalesce(v_user.raw_user_meta_data, '{}'::jsonb);

  -- Quien lo trajo: el que se pasa, o el que quedo guardado en el registro.
  if nullif(trim(coalesce(p_ref, v_md ->> 'ref', '')), '') is not null then
    v_ref := hgg_resolve_code(coalesce(nullif(trim(p_ref), ''), v_md ->> 'ref'));
    if v_ref = p_uid then v_ref := null; end if;
  end if;

  insert into ecos_members
    (id, email, name, whatsapp, city, country, business, goal, show_in_directory, status, founder, prueba_hasta, referred_by)
  values (
    p_uid,
    v_user.email,
    nullif(trim(v_md ->> 'name'), ''),
    nullif(trim(v_md ->> 'whatsapp'), ''),
    nullif(trim(v_md ->> 'city'), ''),
    nullif(trim(v_md ->> 'country'), ''),
    nullif(trim(v_md ->> 'business'), ''),
    nullif(trim(v_md ->> 'goal'), ''),
    coalesce((v_md ->> 'show_in_directory')::boolean, true),
    'pendiente',
    v_cupo,
    v_hasta,
    v_ref
  )
  on conflict (id) do nothing;
end;
$$;

revoke execute on function ecos_inscribir(uuid, text) from public, anon, authenticated;

-- 6. El estado que ve el embajador de sus referidos -------------------------
create or replace function ecos_mis_referidos()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(x order by x.desde desc), '[]'::json)
  from (
    select
      coalesce(
        nullif(trim(
          split_part(trim(m.name), ' ', 1) ||
          case when position(' ' in trim(m.name)) > 0
               then ' ' || upper(left(split_part(trim(m.name), ' ', 2), 1)) || '.'
               else '' end
        ), ''),
        'Sin nombre'
      ) as nombre,
      case
        when m.status = 'activo' or m.teacher or m.cortesia then 'activo'
        when ecos_en_prueba(m.status, m.founder, m.prueba_hasta) then 'prueba'
        when m.status = 'pausado' then 'pausado'
        when m.status = 'cancelado' then 'cancelado'
        else 'sin_activar'
      end as estado,
      m.created_at as desde
    from ecos_members m
    where m.referred_by = auth.uid()
      and m.id <> auth.uid()
  ) x;
$$;

revoke all on function ecos_mis_referidos() from public, anon;
grant execute on function ecos_mis_referidos() to authenticated;

-- 7. Quien quedo sin prueba (se registro con el cupo lleno, por ejemplo) ---
-- recibe sus 14 dias desde hoy. No toca a fundadores ni a quien ya activo.
-- «ecos.sistema» deja pasar el cambio por el guardia (desde el SQL Editor no
-- hay sesion de admin, y sin esto el guardia lo revertia en silencio).
select set_config('ecos.sistema', '1', false);
update ecos_members
set prueba_hasta = now() + make_interval(days => ecos_prueba_dias())
where status = 'pendiente'
  and not founder
  and prueba_hasta is null
  and stripe_subscription_id is null
  and not teacher
  and not cortesia;

-- 8. Los que tienen cuenta de ECOS pero todavia no ficha, entran ahora -----
do $$
declare
  r record;
begin
  for r in
    select u.id from auth.users u
    join profiles p on p.id = u.id and p.role = 'member'
    where coalesce(u.raw_user_meta_data ->> 'whatsapp', '') <> ''
      and coalesce(u.raw_user_meta_data ->> 'profesor', '') <> 'true'
      and not exists (select 1 from ecos_members m where m.id = u.id)
    order by u.created_at
  loop
    perform ecos_inscribir(r.id, null);
  end loop;
end;
$$;

select set_config('ecos.sistema', '', false);

-- La marca de campana de 20261014 tenia el mismo problema: se vuelve a copiar.
select set_config('ecos.sistema', '1', false);
update ecos_members m
set de_campana = true,
    campana = u.raw_user_meta_data -> 'campana'
from auth.users u
where u.id = m.id
  and not m.de_campana
  and jsonb_typeof(u.raw_user_meta_data -> 'campana') = 'object';
select set_config('ecos.sistema', '', false);

-- Para revisar: quien esta en prueba y hasta cuando.
select m.email, m.status, m.founder, m.prueba_hasta at time zone 'America/New_York' as prueba_hasta,
       ecos_en_prueba(m.status, m.founder, m.prueba_hasta) as en_prueba
from ecos_members m
where m.status = 'pendiente'
order by m.created_at desc
limit 15;
