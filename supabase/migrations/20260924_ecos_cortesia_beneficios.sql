-- =====================================================================
-- ECOS · La cortesia con los beneficios completos, y dos arreglos de referidos
-- =====================================================================
-- 1. Quien tiene cortesia es miembro fundador y embajador, igual que quien
--    paga: 10% de descuento y 10% de comision. Lo unico que no hace es sumar
--    ingresos.
-- 2. ARREGLO: la lista de quien puede referir (hgg_referrers) se lleno una sola
--    vez al crearla. Quien entraba al club despues tenia codigo en su panel,
--    pero su enlace no le generaba comisiones. Ahora cada ficha nueva entra
--    sola, y se completa a quien falte.
-- 3. ARREGLO: el pago del club buscaba el codigo solo entre miembros activos,
--    asi que el enlace de un afiliado no servia para el club. Ahora usa la
--    misma regla que la tienda.
-- =====================================================================

-- 1a. Embajador: pago activo o cortesia ----------------------------------
create or replace function hgg_referrer_kind(p_user uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when exists (select 1 from ecos_members
                 where id = p_user and (status = 'activo' or cortesia))
      then 'embajador'
    when exists (select 1 from hgg_referrers where id = p_user and approved)
      then 'afiliado'
    else null
  end;
$$;

-- 1b. El cupo de fundadores cuenta tambien a quien tiene cortesia ----------
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
    where founder and (status in ('activo', 'pendiente') or cortesia)
  )
  select json_build_object(
    'cap',   (select n from cap),
    'taken', (select n from taken),
    'left',  greatest(0, (select n from cap) - (select n from taken))
  );
$$;

-- 2. Toda ficha con codigo queda habilitada para referir -----------------
create or replace function hgg_sync_referrer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_code is not null and new.referral_code <> '' then
    -- Sin objetivo en el on conflict: si el codigo chocara con el de un
    -- afiliado, se ignora en vez de hacer fallar el alta del miembro, que es
    -- justo cuando acaba de pagar.
    insert into hgg_referrers (id, code, approved)
    values (new.id, new.referral_code, true)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists hgg_sync_referrer on ecos_members;
create trigger hgg_sync_referrer
  after insert or update of referral_code on ecos_members
  for each row execute function hgg_sync_referrer();

-- Los que entraron entre la migracion anterior y esta.
insert into hgg_referrers (id, code, approved)
select id, referral_code, true
from ecos_members
where referral_code is not null and referral_code <> ''
on conflict do nothing;

-- 3. El club resuelve los codigos igual que la tienda --------------------
create or replace function ecos_resolve_referral(code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select hgg_resolve_code(code);
$$;
