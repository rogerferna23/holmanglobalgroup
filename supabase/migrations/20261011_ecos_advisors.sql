-- Avisos del Security Advisor de Supabase (oct 2026). Se puede correr mas de
-- una vez.

-- 1. «Function Search Path Mutable» ---------------------------------------
-- Toda funcion propia del esquema public que no fije su search_path queda con
-- «public». No toca las funciones que trae una extension (pg_net, etc.).
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as firma
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
      )
      and not exists (
        select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('alter function %s set search_path = public', f.firma);
  end loop;
end;
$$;

-- 3. «RLS Policy Always True» en ecos_guests -------------------------------
-- El formulario de invitados sigue abierto a cualquiera sin cuenta (es la
-- idea), pero ahora solo acepta un registro con nombre y correo validos, para
-- una masterclass publicada y abierta a invitados. ecos_open_session() es la
-- misma funcion que usa la pagina para mostrar la masterclass.
drop policy if exists "ecos_guests_public_insert" on ecos_guests;
create policy "ecos_guests_public_insert" on ecos_guests
  for insert to anon, authenticated
  with check (
    length(trim(name)) between 2 and 120
    and length(email) <= 200
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and session_id is not null
    and exists (select 1 from ecos_open_session(session_id))
  );

-- Para revisar: cuantas funciones propias quedan sin search_path (debe ser 0).
select count(*) as funciones_sin_search_path
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e');
