-- =====================================================================
-- ECOS · Profesores fundadores, y una regla unica para el cupo
-- =====================================================================
-- Los profesores cuentan como miembros fundadores, igual que las cortesias.
--
-- El cupo se cuenta con una sola regla, la misma que usa el pago del club:
-- fundador y dentro del club (paga, tiene cortesia o da clase). Antes el
-- contador publico sumaba tambien fichas «pendientes» que nunca pagaron —de
-- pruebas o de checkouts abandonados de antes—, y el pago no; asi los dos
-- numeros podian no coincidir.
-- =====================================================================

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
    where founder and (status = 'activo' or cortesia or teacher)
  )
  select json_build_object(
    'cap',   (select n from cap),
    'taken', (select n from taken),
    'left',  greatest(0, (select n from cap) - (select n from taken))
  );
$$;

-- Los profesores que ya estaban nombrados pasan a ser fundadores.
update ecos_members set founder = true where teacher and not founder;

-- El listado de cuentas sin acceso dice quien se registro por el enlace de
-- profesor. Cambia lo que devuelve, asi que hay que borrarla antes.
drop function if exists ecos_cuentas_sin_membresia();
create function ecos_cuentas_sin_membresia()
returns table (id uuid, email text, name text, created_at timestamptz, vino_como_profesor boolean)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.email, p.name, p.created_at,
         coalesce(u.raw_user_meta_data->>'profesor', '') = 'true'
  from profiles p
  join auth.users u on u.id = p.id
  where is_admin()
    and p.role not in ('super', 'admin', 'vendor')
    and not exists (select 1 from ecos_members m where m.id = p.id)
  order by p.created_at desc
  limit 100;
$$;

revoke all on function ecos_cuentas_sin_membresia() from public;
grant execute on function ecos_cuentas_sin_membresia() to authenticated;
