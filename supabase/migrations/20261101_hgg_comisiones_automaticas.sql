-- Comisiones automáticas: embajador + closer al comprar, y DelegaWork mensual (26 oct 2026).
--
-- La Sesión de Claridad ya guarda quién trajo a la persona (hgg_citas.referrer)
-- y quién la atendió (hgg_citas.anfitrion). Con eso:
--
--   · Toda venta aprobada en manual_sales (con tarjeta por el webhook de
--     Stripe, o por transferencia registrada en la Torre) causa sola:
--       - la comisión del EMBAJADOR (10%, o el % especial: 15% Fundadores
--         Elite), buscando quién la trajo: la venta, su Claridad o la
--         masterclass a la que la invitaron;
--       - la del CLOSER (10%) si su última Claridad la dio alguien del equipo
--         que no es Holman (hoy Zack). ECOS no lleva closer.
--     Si la venta se cancela o se borra, esas comisiones quedan anuladas.
--
--   · DelegaWork se cobra fuera del sitio: Holman marca en la cita «cerró
--     DelegaWork, plan X» (hgg_delegawork_clientes) y la comisión del
--     embajador aparece ese mes y cada 1 de mes, sola, hasta que marque que
--     el cliente canceló.
--
-- Todo va a hgg_commissions, así el embajador lo ve en «Mi negocio» y el
-- closer también (en su propio «Mi negocio»). La regla de cuánto y a quién
-- vive aquí, no en el navegador.
--
-- Se puede correr más de una vez.

-- 1. Dos fuentes y una figura nuevas ----------------------------------------
alter table hgg_commissions drop constraint if exists hgg_commissions_source_check;
alter table hgg_commissions add constraint hgg_commissions_source_check
  check (source in ('club', 'producto', 'closer', 'delegawork'));
alter table hgg_commissions drop constraint if exists hgg_commissions_referrer_kind_check;
alter table hgg_commissions add constraint hgg_commissions_referrer_kind_check
  check (referrer_kind in ('embajador', 'afiliado', 'closer'));

-- El 15% de los Fundadores Elite vale también para DelegaWork.
create or replace function hgg_commissions_pct_especial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pct numeric;
begin
  if new.source in ('producto', 'delegawork') then
    select pct into v_pct from hgg_comision_especial
    where user_id = new.referrer_id and (hasta is null or hasta > now());
    if v_pct is not null and v_pct > new.pct then
      new.pct := v_pct;
      new.amount := round(new.base_amount * v_pct / 100.0, 2);
    end if;
  end if;
  return new;
end;
$$;

-- 2. Quién trajo a esta persona ------------------------------------------------
-- La venta manda; si no dice, su primera Claridad con embajador; si no, la
-- masterclass a la que la invitó un miembro.
create or replace function hgg_quien_trajo(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select c.referrer from hgg_citas c
      where lower(c.email) = lower(trim(p_email)) and c.referrer is not null
      order by c.created_at limit 1),
    (select g.invited_by from ecos_guests g
      where lower(g.email) = lower(trim(p_email)) and g.invited_by is not null
      order by g.created_at limit 1)
  );
$$;

-- 3. El closer de una venta --------------------------------------------------
-- La última Claridad de esa persona antes de la venta. Si la dio Holman, no
-- hay closer (él no se paga comisión). La cuenta del closer es la del correo
-- de su ficha en hgg_agenda_anfitriones.
create or replace function hgg_award_closer(
  p_sale_id text, p_email text, p_name text, p_concept text, p_base numeric
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anf  text;
  v_user uuid;
  v_id   bigint;
begin
  if p_email is null or p_base is null or p_base <= 0 then
    return null;
  end if;
  select c.anfitrion into v_anf from hgg_citas c
  where lower(c.email) = lower(trim(p_email)) and c.tipo = 'claridad' and c.estado <> 'cancelada'
    and c.inicio <= now()
  order by c.inicio desc limit 1;
  if v_anf is null or v_anf = 'holman' then
    return null;
  end if;
  select u.id into v_user from hgg_agenda_anfitriones f
  join auth.users u on lower(u.email) = lower(f.correo)
  where f.id = v_anf;
  if v_user is null then
    return null;
  end if;
  insert into hgg_commissions
    (referrer_id, source, source_id, buyer_email, buyer_name, concept, base_amount, pct, amount, referrer_kind)
  values
    (v_user, 'closer', p_sale_id, p_email, p_name, p_concept, p_base, 10, round(p_base * 0.10, 2), 'closer')
  on conflict (source, source_id) do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- 4. Cada venta aprobada causa sus comisiones ----------------------------------
create or replace function hgg_manual_sales_comisiones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref uuid;
begin
  if tg_op = 'DELETE' then
    update hgg_commissions set status = 'anulada'
     where source in ('producto', 'closer') and source_id = old.id and status = 'pendiente';
    return old;
  end if;

  if new.status = 'Cancelado' then
    update hgg_commissions set status = 'anulada'
     where source in ('producto', 'closer') and source_id = new.id and status = 'pendiente';
    return new;
  end if;

  if new.status <> 'Aprobado' or coalesce(new.amount, 0) <= 0 then
    return new;
  end if;
  -- ECOS no pasa por aquí (lo paga ecos-webhook), y no lleva closer.
  if new.service_id like 'ecos%' then
    return new;
  end if;

  v_ref := coalesce(new.referred_by, hgg_quien_trajo(new.client_email));
  if v_ref is not null then
    perform hgg_award_commission(v_ref, 'producto', new.id, null, new.client_email,
                                 new.client_name, new.service_title, new.amount, 10.0);
  end if;
  perform hgg_award_closer(new.id, new.client_email, new.client_name, new.service_title, new.amount);
  return new;
end;
$$;

drop trigger if exists hgg_manual_sales_comisiones on manual_sales;
create trigger hgg_manual_sales_comisiones
  after insert or update of status or delete on manual_sales
  for each row execute function hgg_manual_sales_comisiones();

-- 5. DelegaWork: el cliente y su comisión de cada mes ----------------------------
create table if not exists hgg_delegawork_clientes (
  id           uuid primary key default gen_random_uuid(),
  cita_id      uuid references hgg_citas (id) on delete set null,
  nombre       text not null,
  email        text not null,
  plan         text not null check (plan in ('basico', 'starter', 'pro', 'elite')),
  -- Lo que paga al mes, en USD (el precio de la tienda): la base de la comisión.
  precio_usd   numeric(10,2) not null check (precio_usd > 0),
  referrer     uuid references auth.users (id) on delete set null,
  inicio       date not null default current_date,
  cancelado_en date,
  notas        text,
  created_at   timestamptz not null default now()
);

create index if not exists hgg_delegawork_clientes_cita_idx on hgg_delegawork_clientes (cita_id);

alter table hgg_delegawork_clientes enable row level security;
drop policy if exists hgg_delegawork_clientes_admin on hgg_delegawork_clientes;
create policy hgg_delegawork_clientes_admin on hgg_delegawork_clientes
  for all using (is_admin()) with check (is_admin());

-- La comisión del mes de cada cliente activo. Una por cliente y mes (el
-- source_id lo garantiza). La corre el cron el día 1 y la Torre al registrar.
create or replace function hgg_delegawork_comisiones_mes(p_mes date default current_date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes  date := date_trunc('month', p_mes)::date;
  v_n    int := 0;
  r      record;
begin
  -- La corre el cron (sin sesión) o un admin desde la Torre; nadie más.
  if coalesce(auth.role(), '') = 'authenticated' and not is_admin() then
    raise exception 'No autorizado';
  end if;
  for r in
    select * from hgg_delegawork_clientes
    where referrer is not null
      and inicio < (v_mes + interval '1 month')
      and (cancelado_en is null or cancelado_en > v_mes)
  loop
    if hgg_award_commission(r.referrer, 'delegawork', r.id::text || ':' || to_char(v_mes, 'YYYY-MM'),
         null, r.email, r.nombre,
         'DelegaWork ' || initcap(r.plan) || ' · ' || to_char(v_mes, 'MM/YYYY'),
         r.precio_usd, 10.0) is not null then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

revoke all on function hgg_delegawork_comisiones_mes(date) from public, anon;
grant execute on function hgg_delegawork_comisiones_mes(date) to authenticated, service_role;
revoke all on function hgg_award_closer(text, text, text, text, numeric) from public, anon, authenticated;
revoke all on function hgg_quien_trajo(text) from public, anon, authenticated;

-- Cada 1 de mes a las 8 a. m. de Bogotá.
select cron.unschedule('hgg-delegawork-comisiones')
where exists (select 1 from cron.job where jobname = 'hgg-delegawork-comisiones');
select cron.schedule('hgg-delegawork-comisiones', '0 13 1 * *',
  $$select hgg_delegawork_comisiones_mes();$$);

-- Para revisar
select jobname, schedule from cron.job where jobname = 'hgg-delegawork-comisiones';
