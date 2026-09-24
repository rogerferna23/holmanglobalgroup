-- Codigos de referido sencillos: el primer nombre de la persona.
--
-- Antes: 8 letras y numeros al azar (p. ej. XK7QPA3B). Ahora: HOLMAN, ZACK,
-- INGRID... y si el nombre ya esta tomado, un numero al final (MARIA2).
-- Los codigos viejos SIGUEN funcionando: se guardan en hgg_referrers.old_code
-- y el resolvedor los acepta, por si alguien ya repartio su enlace.
--
-- Se puede correr mas de una vez sin problema.

-- 1. El codigo viejo queda como alias ------------------------------------
alter table hgg_referrers add column if not exists old_code text;
create index if not exists hgg_referrers_old_code_idx on hgg_referrers (lower(old_code));

-- 2. Generador -----------------------------------------------------------
create or replace function hgg_codigo_amigable(p_nombre text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base  text;
  cand  text;
  n     int := 2;
begin
  -- Primer nombre, sin tildes ni simbolos, en mayusculas, maximo 12 letras.
  base := upper(translate(split_part(trim(coalesce(p_nombre, '')), ' ', 1),
                          'áéíóúüñÁÉÍÓÚÜÑàèìòùÀÈÌÒÙ', 'aeiouunAEIOUUNaeiouAEIOU'));
  base := left(regexp_replace(base, '[^A-Z]', '', 'g'), 12);
  if length(base) < 3 then base := 'ECOS'; end if;

  cand := base;
  loop
    exit when not exists (
      select 1 from hgg_referrers
      where lower(code) = lower(cand) or lower(old_code) = lower(cand)
    ) and not exists (
      select 1 from ecos_members where lower(referral_code) = lower(cand)
    );
    cand := base || n;
    n := n + 1;
  end loop;
  return cand;
end;
$$;

revoke all on function hgg_codigo_amigable(text) from public;
grant execute on function hgg_codigo_amigable(text) to authenticated;

-- 3. Los miembros nuevos reciben el codigo con su nombre -----------------
create or replace function ecos_members_set_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_code is null then
    new.referral_code := hgg_codigo_amigable(coalesce(
      nullif(trim(new.name), ''),
      (select nullif(trim(p.name), '') from profiles p where p.id = new.id),
      split_part(new.email, '@', 1)
    ));
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
    select h.id, h.code,
           coalesce(nullif(trim(m.name), ''), nullif(trim(p.name), ''),
                    split_part(coalesce(m.email, p.email, ''), '@', 1)) as nombre
    from hgg_referrers h
    left join ecos_members m on m.id = h.id
    left join profiles p on p.id = h.id
    where h.old_code is null            -- los que ya se cambiaron no se tocan
    order by h.created_at
  loop
    -- Se libera el codigo propio para que no choque consigo mismo.
    update hgg_referrers set old_code = code, code = 'TMP-' || id where id = r.id;
    update ecos_members set referral_code = null where id = r.id;
    nuevo := hgg_codigo_amigable(r.nombre);
    update hgg_referrers set code = nuevo where id = r.id;
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
order by h.created_at;
