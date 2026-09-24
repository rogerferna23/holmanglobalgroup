-- Octubre gratis SIN tarjeta.
--
-- Quien crea su cuenta mientras haya cupo de fundador entra al club y lo usa
-- todo hasta el fin de la prueba (ecos_settings.trial_end, 1 de noviembre).
-- Si antes de esa fecha activa su membresia (tarjeta en Stripe, primer cobro
-- el 1 de noviembre), sigue sin cortes. Si no, desde esa fecha ve el candado.
--
-- El cupo lo ocupa quien se registra (antes: quien pagaba). Cuando se llene,
-- Holman lo sube desde el admin (Ajustes → Cupo de fundadores) y los que se
-- registraron con el cupo lleno entran solos la proxima vez que abran el panel.
--
-- Mientras esta en prueba NO tiene descuento ni comision: eso se abre al
-- activar (hgg_referrer_kind y create-payment-intent miran status = 'activo').
--
-- De paso cierra un hueco: cualquiera con cuenta podia crearse su ficha o
-- editarla marcandose profesor o cortesia.
--
-- Se puede correr mas de una vez.

-- 0. Hueco de seguridad ---------------------------------------------------
-- La ficha la crean solo el webhook (service_role) y ecos_unirse_prueba().
drop policy if exists "ecos_members_self_insert" on ecos_members;

-- El guardia protege tambien teacher y cortesia (se agregaron despues de el).
-- `ecos.sistema` lo prende ecos_unirse_prueba() para poder marcar fundador.
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
  new.created_at             := old.created_at;
  return new;
end;
$$;

-- 1. Fin de la prueba, en un solo lugar ----------------------------------
create or replace function ecos_trial_end()
returns timestamptz
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    nullif(trim((select value from ecos_settings where key = 'trial_end')), '')::timestamptz,
    '2026-11-01T12:00:00-05:00'::timestamptz
  );
$$;

-- 2. Quien esta en prueba entra a todo -----------------------------------
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
        or (status = 'pendiente' and founder and now() < ecos_trial_end())
      )
  );
$$;

-- 3. El cupo lo ocupa quien se registra ----------------------------------
create or replace function ecos_founder_spots()
returns json
language sql
security definer
set search_path = public
stable
as $$
  with cap as (
    select coalesce(nullif((select value from ecos_settings where key = 'founder_cap'), ''), '20')::int as n
  ),
  taken as (
    select count(*)::int as n from ecos_members
    where founder and (status in ('activo', 'pendiente') or cortesia or teacher)
  )
  select json_build_object(
    'cap',   (select n from cap),
    'taken', (select n from taken),
    'left',  greatest(0, (select n from cap) - (select n from taken))
  );
$$;

-- 4. Entrar a la prueba --------------------------------------------------
-- La llama el panel al abrirse. Crea la ficha (pendiente) con los datos del
-- registro y la marca fundador si hay cupo. Si ya tiene ficha sin cupo y el
-- cupo crecio, la sube. Solo cuentas de rol member: un admin que abre el
-- panel no ocupa lugar.
drop function if exists ecos_unirse_prueba();
create or replace function ecos_unirse_prueba(p_ref text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_user  auth.users%rowtype;
  v_md    jsonb;
  v_row   ecos_members%rowtype;
  v_cupo  boolean;
  v_ref   uuid;
begin
  if v_uid is null then return; end if;
  if now() >= ecos_trial_end() then return; end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'member') then return; end if;

  -- De a uno: que dos registros al mismo tiempo no se pasen del cupo.
  perform pg_advisory_xact_lock(hashtext('ecos_unirse_prueba'));

  select * into v_row from ecos_members where id = v_uid;
  if found and (v_row.founder or v_row.status <> 'pendiente') then return; end if;

  v_cupo := (ecos_founder_spots() ->> 'left')::int > 0;
  perform set_config('ecos.sistema', '1', true);

  if found then
    if v_cupo then update ecos_members set founder = true where id = v_uid; end if;
    return;
  end if;

  -- Quien lo trajo, si llego por un enlace. Nadie se refiere a si mismo.
  if nullif(trim(coalesce(p_ref, '')), '') is not null then
    v_ref := ecos_resolve_referral(p_ref);
    if v_ref = v_uid then v_ref := null; end if;
  end if;

  select * into v_user from auth.users where id = v_uid;
  v_md := coalesce(v_user.raw_user_meta_data, '{}'::jsonb);

  insert into ecos_members
    (id, email, name, whatsapp, city, country, business, goal, show_in_directory, status, founder, referred_by)
  values (
    v_uid,
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
    v_ref
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function ecos_unirse_prueba(text) from public;
grant execute on function ecos_unirse_prueba(text) to authenticated;

-- 5. En prueba no se refiere ---------------------------------------------
-- Toda ficha con codigo entra a hgg_referrers; antes con approved = true, y
-- eso la volvia «afiliado». Ahora approved solo si ya es miembro de verdad.
-- Al activar pasa a embajador sola: esa figura sale del status, no de aqui.
create or replace function hgg_sync_referrer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_code is not null and new.referral_code <> '' then
    insert into hgg_referrers (id, code, approved)
    values (new.id, new.referral_code, new.status = 'activo' or new.cortesia or new.teacher)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Para revisar
select ecos_trial_end() as fin_de_la_prueba, ecos_founder_spots() as cupo;
