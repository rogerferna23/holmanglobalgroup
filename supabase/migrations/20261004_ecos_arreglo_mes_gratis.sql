-- Arreglo: el mes gratis no se abria para nadie nuevo.
--
-- En ecos_inscribir (y antes en ecos_unirse_prueba) se preguntaba FOUND despues
-- de un PERFORM set_config(...). En PL/pgSQL un PERFORM que devuelve una fila
-- pone FOUND en true, asi que la funcion «creia» que la persona ya tenia ficha,
-- intentaba actualizarla (0 filas) y salia sin crear nada. Les paso a Samuel,
-- Daniel y a quien se registro desde el 24 de septiembre.
--
-- Se puede correr mas de una vez.

create or replace function ecos_inscribir(p_uid uuid, p_ref text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  auth.users%rowtype;
  v_md    jsonb;
  v_row   ecos_members%rowtype;
  v_cupo  boolean;
  v_ref   uuid;
  v_existe boolean;
begin
  if p_uid is null or now() >= ecos_trial_end() then return; end if;

  -- De a uno: que dos registros al mismo tiempo no se pasen del cupo.
  perform pg_advisory_xact_lock(hashtext('ecos_unirse_prueba'));

  select * into v_row from ecos_members where id = p_uid;
  -- Se guarda YA: el PERFORM de abajo pisa FOUND (un PERFORM que devuelve una
  -- fila lo pone en true). Ese era el error: nunca se creaba la ficha.
  v_existe := found;
  if v_existe and (v_row.founder or v_row.status <> 'pendiente') then return; end if;

  v_cupo := (ecos_founder_spots() ->> 'left')::int > 0;
  perform set_config('ecos.sistema', '1', true);

  if v_existe then
    if v_cupo then update ecos_members set founder = true where id = p_uid; end if;
    return;
  end if;

  select * into v_user from auth.users where id = p_uid;
  if not found then return; end if;
  v_md := coalesce(v_user.raw_user_meta_data, '{}'::jsonb);

  -- Quien lo trajo: el que se pasa, o el que quedo guardado en el registro.
  if nullif(trim(coalesce(p_ref, v_md ->> 'ref', '')), '') is not null then
    v_ref := hgg_resolve_code(coalesce(nullif(trim(p_ref), ''), v_md ->> 'ref'));
    if v_ref = p_uid then v_ref := null; end if;
  end if;

  insert into ecos_members
    (id, email, name, whatsapp, city, country, business, goal, show_in_directory, status, founder, referred_by)
  values (
    p_uid,
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

revoke execute on function ecos_inscribir(uuid, text) from public, anon, authenticated;

-- Los que quedaron por fuera entran ahora.
do $$
declare
  r record;
begin
  for r in
    select u.id from auth.users u
    join profiles p on p.id = u.id and p.role = 'member'
    where coalesce(u.raw_user_meta_data ->> 'whatsapp', '') <> ''
      and coalesce(u.raw_user_meta_data ->> 'profesor', '') <> 'true'
      and not exists (select 1 from ecos_members m where m.id = u.id)
    order by u.created_at
  loop
    perform ecos_inscribir(r.id, null);
  end loop;
end;
$$;

-- Para revisar: las ultimas cuentas. Samuel y Daniel deben salir
-- «pendiente» con mes_gratis = true.
select u.email,
       u.created_at at time zone 'America/New_York' as creada,
       m.status as en_el_club,
       m.founder as mes_gratis,
       m.referral_code as codigo
from auth.users u
left join profiles p on p.id = u.id
left join ecos_members m on m.id = u.id
where p.role = 'member'
order by u.created_at desc
limit 10;
