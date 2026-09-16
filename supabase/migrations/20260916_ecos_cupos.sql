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
