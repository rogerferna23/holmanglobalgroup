-- =====================================================================
-- Referidos y comisiones de Holman Global Group
-- =====================================================================
-- Un solo sistema para toda la casa: el club y la tienda. Antes el club
-- guardaba a quien traia a quien y la tienda no guardaba nada, asi que la
-- comision de un producto no se podia calcular.
--
-- Dos figuras, y la diferencia es el club:
--
--   EMBAJADOR  Miembro activo del club. Gana 10% de TODO lo que compre la
--              gente que trajo, siempre, mientras el siga activo.
--   AFILIADO   No es del club. Gana 10% solo de la PRIMERA compra de cada
--              persona que trae.
--
-- La figura no se guarda: se deduce de si hoy tiene el club activo. Asi quien
-- entra al club sube a embajador solo, y quien lo deja vuelve a afiliado sin
-- que nadie tenga que acordarse de cambiarlo.
-- =====================================================================

-- 1. Quien puede referir ------------------------------------------------
create table if not exists hgg_referrers (
  id          uuid primary key references auth.users(id) on delete cascade,
  code        text not null unique,
  -- Un afiliado entra por decision de Holman; un miembro del club es
  -- embajador por el solo hecho de estarlo.
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table hgg_referrers is
  'Quien tiene codigo para referir. `approved` habilita a quien NO es del club: '
  'los miembros activos refieren sin necesitar aprobacion.';

create index if not exists hgg_referrers_code_idx on hgg_referrers (lower(code));

-- 2. Atribucion en las ventas de la tienda ------------------------------
alter table manual_sales add column if not exists referred_by uuid
  references auth.users(id) on delete set null;
alter table manual_sales add column if not exists ref_code text;

create index if not exists manual_sales_referred_by_idx on manual_sales (referred_by);
create index if not exists manual_sales_client_email_idx on manual_sales (lower(client_email));

-- 3. El libro de comisiones --------------------------------------------
-- Se escribe una fila por comision causada. No se recalcula nunca: si manana
-- cambia el porcentaje, lo ya ganado no se mueve.
create table if not exists hgg_commissions (
  id           bigserial primary key,
  referrer_id  uuid not null references auth.users(id) on delete cascade,
  -- 'club' = suscripcion de ECOS · 'producto' = venta de la tienda
  source       text not null check (source in ('club', 'producto')),
  -- Id de la factura de Stripe o de la venta, para no duplicar.
  source_id    text not null,
  -- Quien compro. Puede no tener cuenta, por eso tambien se guarda el correo.
  buyer_id     uuid references auth.users(id) on delete set null,
  buyer_email  text,
  buyer_name   text,
  concept      text,
  base_amount  numeric(12,2) not null,
  pct          numeric(5,2)  not null,
  amount       numeric(12,2) not null,
  -- Como estaba quien refirio en el momento de causarse. Se guarda porque
  -- manana puede haber dejado el club y la comision ya fue ganada.
  referrer_kind text not null check (referrer_kind in ('embajador', 'afiliado')),
  status       text not null default 'pendiente'
                 check (status in ('pendiente', 'pagada', 'anulada')),
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists hgg_commissions_referrer_idx on hgg_commissions (referrer_id, created_at desc);
create index if not exists hgg_commissions_status_idx on hgg_commissions (status);

-- 4. Quien es que ------------------------------------------------------
create or replace function hgg_referrer_kind(p_user uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when exists (select 1 from ecos_members where id = p_user and status = 'activo')
      then 'embajador'
    when exists (select 1 from hgg_referrers where id = p_user and approved)
      then 'afiliado'
    else null
  end;
$$;

-- Resuelve un codigo a la persona que lo tiene. Sirve para club y tienda.
create or replace function hgg_resolve_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select r.id from hgg_referrers r
  where lower(r.code) = lower(trim(p_code))
    and hgg_referrer_kind(r.id) is not null
  limit 1;
$$;

revoke all on function hgg_resolve_code(text) from public;
grant execute on function hgg_resolve_code(text) to anon, authenticated;

-- 5. Causar una comision ------------------------------------------------
-- La regla de las dos figuras vive aqui y en ningun otro lado.
create or replace function hgg_award_commission(
  p_referrer   uuid,
  p_source     text,
  p_source_id  text,
  p_buyer_id   uuid,
  p_buyer_email text,
  p_buyer_name text,
  p_concept    text,
  p_base       numeric,
  p_pct        numeric default 10.0
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind    text;
  v_previas int;
  v_id      bigint;
begin
  if p_referrer is null or p_base is null or p_base <= 0 then
    return null;
  end if;

  v_kind := hgg_referrer_kind(p_referrer);
  if v_kind is null then
    return null;  -- ya no esta habilitado para referir
  end if;

  -- Nadie cobra por su propia compra.
  if p_buyer_id is not null and p_buyer_id = p_referrer then
    return null;
  end if;

  -- El afiliado cobra una sola vez por cada persona que trae. El embajador,
  -- siempre. Por eso se miran las comisiones previas de ESE comprador.
  if v_kind = 'afiliado' then
    select count(*) into v_previas
    from hgg_commissions
    where referrer_id = p_referrer
      and status <> 'anulada'
      and (
        (p_buyer_id is not null and buyer_id = p_buyer_id)
        or (p_buyer_email is not null and lower(buyer_email) = lower(p_buyer_email))
      );
    if v_previas > 0 then
      return null;
    end if;
  end if;

  insert into hgg_commissions
    (referrer_id, source, source_id, buyer_id, buyer_email, buyer_name,
     concept, base_amount, pct, amount, referrer_kind)
  values
    (p_referrer, p_source, p_source_id, p_buyer_id, p_buyer_email, p_buyer_name,
     p_concept, p_base, p_pct, round(p_base * p_pct / 100.0, 2), v_kind)
  on conflict (source, source_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

-- 6. Lo que ve cada quien de lo suyo -----------------------------------
create or replace function hgg_my_commissions()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'kind',      hgg_referrer_kind(auth.uid()),
    'code',      (select code from hgg_referrers where id = auth.uid()),
    'pendiente', coalesce((select sum(amount) from hgg_commissions
                            where referrer_id = auth.uid() and status = 'pendiente'), 0),
    'pagado',    coalesce((select sum(amount) from hgg_commissions
                            where referrer_id = auth.uid() and status = 'pagada'), 0),
    'total',     coalesce((select sum(amount) from hgg_commissions
                            where referrer_id = auth.uid() and status <> 'anulada'), 0),
    'personas',  coalesce((select count(distinct coalesce(buyer_id::text, lower(buyer_email)))
                            from hgg_commissions
                            where referrer_id = auth.uid() and status <> 'anulada'), 0),
    'movimientos', coalesce((
      select json_agg(x order by x.created_at desc)
      from (
        select id, source, concept, buyer_name, base_amount, pct, amount, status, created_at
        from hgg_commissions
        where referrer_id = auth.uid() and status <> 'anulada'
        order by created_at desc
        limit 50
      ) x
    ), '[]'::json)
  );
$$;

revoke all on function hgg_my_commissions() from public;
grant execute on function hgg_my_commissions() to authenticated;

-- 7. Permisos -----------------------------------------------------------
alter table hgg_referrers   enable row level security;
alter table hgg_commissions enable row level security;

drop policy if exists "referrers_self_read"  on hgg_referrers;
create policy "referrers_self_read"  on hgg_referrers
  for select using (id = auth.uid());

drop policy if exists "referrers_admin_all"  on hgg_referrers;
create policy "referrers_admin_all"  on hgg_referrers
  for all using (is_admin()) with check (is_admin());

-- Las comisiones se leen por la funcion de arriba; aqui solo el admin.
drop policy if exists "commissions_self_read" on hgg_commissions;
create policy "commissions_self_read" on hgg_commissions
  for select using (referrer_id = auth.uid());

drop policy if exists "commissions_admin_all" on hgg_commissions;
create policy "commissions_admin_all" on hgg_commissions
  for all using (is_admin()) with check (is_admin());

-- 8. Los miembros que ya tienen codigo entran al registro ---------------
insert into hgg_referrers (id, code, approved)
select id, referral_code, true
from ecos_members
where referral_code is not null and referral_code <> ''
on conflict (id) do nothing;
