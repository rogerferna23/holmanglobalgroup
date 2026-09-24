-- Codigos de referido sencillos: ECOS y un numero.
--
-- Antes: 8 letras y numeros al azar (p. ej. XK7QPA3B). Ahora: ECOS1 (Holman),
-- ECOS2 (Ingrid) y de ahi en adelante en el orden en que cada quien entro.
-- Cada persona nueva —miembro o afiliado aprobado— recibe el siguiente numero.
-- Los codigos viejos SIGUEN funcionando: se guardan en hgg_referrers.old_code
-- y el resolvedor los acepta, por si alguien ya repartio su enlace.
--
-- Se puede correr mas de una vez sin problema.

-- 1. El codigo viejo queda como alias ------------------------------------
alter table hgg_referrers add column if not exists old_code text;
create index if not exists hgg_referrers_old_code_idx on hgg_referrers (lower(old_code));

-- 2. Generador: el siguiente ECOS libre ----------------------------------
drop function if exists hgg_codigo_amigable(text);
create or replace function hgg_nuevo_codigo()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  -- De a uno: que dos altas al mismo tiempo no se lleven el mismo numero.
  perform pg_advisory_xact_lock(hashtext('hgg_nuevo_codigo'));
  select coalesce(max(substring(c from '^ECOS([0-9]+)$')::int), 0) + 1 into n
  from (
    select upper(code) as c from hgg_referrers
    union all select upper(old_code) from hgg_referrers where old_code is not null
    union all select upper(referral_code) from ecos_members where referral_code is not null
  ) t;
  return 'ECOS' || n;
end;
$$;

revoke all on function hgg_nuevo_codigo() from public;
grant execute on function hgg_nuevo_codigo() to authenticated;

-- 3. Los miembros nuevos reciben el siguiente numero ---------------------
create or replace function ecos_members_set_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_code is null then
    new.referral_code := hgg_nuevo_codigo();
  end if;
  return new;
end;
$$;

-- 4. El resolvedor acepta el codigo nuevo y el viejo ---------------------
create or replace function hgg_resolve_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select r.id from hgg_referrers r
  where (lower(r.code) = lower(trim(p_code)) or lower(r.old_code) = lower(trim(p_code)))
    and hgg_referrer_kind(r.id) is not null
  order by (lower(r.code) = lower(trim(p_code))) desc
  limit 1;
$$;

-- 5. Cambiar los codigos que ya existen ----------------------------------
-- El guardia de ecos_members no deja tocar referral_code desde el editor
-- SQL (no hay sesion de admin), asi que se apaga solo durante el cambio.
alter table ecos_members disable trigger ecos_members_guard;

do $$
declare
  r      record;
  nuevo  text;
begin
  for r in
    select h.id,
           coalesce(nullif(trim(m.name), ''), nullif(trim(p.name), ''), '') as nombre
    from hgg_referrers h
    left join ecos_members m on m.id = h.id
    left join profiles p on p.id = h.id
    where h.old_code is null            -- los que ya se cambiaron no se tocan
    order by
      case
        when coalesce(m.name, p.name, '') ilike 'holman%' then 0
        when coalesce(m.name, p.name, '') ilike 'ingrid%' then 1
        else 2
      end,
      h.created_at
  loop
    nuevo := hgg_nuevo_codigo();
    update hgg_referrers set old_code = code, code = nuevo where id = r.id;
    update ecos_members set referral_code = nuevo where id = r.id;
  end loop;
end;
$$;

alter table ecos_members enable trigger ecos_members_guard;

-- Para revisar: nombre, codigo nuevo y el viejo que sigue sirviendo.
select coalesce(m.name, p.name) as nombre, h.code as codigo, h.old_code as codigo_viejo
from hgg_referrers h
left join ecos_members m on m.id = h.id
left join profiles p on p.id = h.id
order by substring(h.code from '[0-9]+')::int nulls last;
