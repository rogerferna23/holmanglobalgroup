-- Vuelve a poner la regla de los enlaces que acepta a quien esta en su mes
-- gratis. Correr otra vez 20260927_codigos_sencillos.sql despues de
-- 20260930_ecos_ajustes_auditoria.sql la habia reemplazado por la anterior, y
-- los enlaces de quien esta en prueba (ECOS6, ECOS7...) no asociaban a nadie.
-- Se puede correr mas de una vez.

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
        where m.id = r.id and m.status = 'pendiente' and m.founder and now() < ecos_trial_end()
      )
    )
  order by (lower(r.code) = lower(trim(p_code))) desc
  limit 1;
$$;

-- Para revisar: cada codigo debe devolver un id, no null.
select c as codigo, hgg_resolve_code(c) as dueno
from unnest(array['ECOS1', 'ECOS6', 'ECOS7', 'ECOS8']) as c;
