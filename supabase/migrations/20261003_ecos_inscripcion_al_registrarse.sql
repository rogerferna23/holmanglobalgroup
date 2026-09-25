-- El mes gratis se abre al CREAR LA CUENTA, en el servidor.
--
-- Antes lo abria el panel la primera vez que la persona entraba. Si tenia
-- abierta una version vieja de la pagina (la que pedia tarjeta), nunca llegaba
-- a pedirlo y quedaba como «cuenta sin acceso» (le paso a Daniel y a Samuel).
-- Ahora un trigger sobre auth.users lo hace apenas se registra, venga del
-- navegador que venga. ecos_unirse_prueba() sigue existiendo como respaldo.
--
-- Solo se inscriben las cuentas que vienen del registro del club (traen
-- WhatsApp en sus datos). Las que crea el admin para vendedores o admins, y
-- las del enlace de profesor, no.
--
-- Va DESPUES de 20260929_ecos_prueba_sin_tarjeta.sql. Se puede correr mas de
-- una vez.

-- 1. El nucleo, sin mirar quien llama ------------------------------------
-- Solo lo usan el trigger y ecos_unirse_prueba(); nadie de afuera.
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
begin
  if p_uid is null or now() >= ecos_trial_end() then return; end if;

  -- De a uno: que dos registros al mismo tiempo no se pasen del cupo.
  perform pg_advisory_xact_lock(hashtext('ecos_unirse_prueba'));

  select * into v_row from ecos_members where id = p_uid;
  if found and (v_row.founder or v_row.status <> 'pendiente') then return; end if;

  v_cupo := (ecos_founder_spots() ->> 'left')::int > 0;
  perform set_config('ecos.sistema', '1', true);

  if found then
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

-- 2. El respaldo desde el panel usa el mismo nucleo ----------------------
create or replace function ecos_unirse_prueba(p_ref text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  -- Un admin que abre el panel no ocupa lugar.
  if not exists (select 1 from profiles where id = auth.uid() and role = 'member') then return; end if;
  perform ecos_inscribir(auth.uid(), p_ref);
end;
$$;

revoke execute on function ecos_unirse_prueba(text) from public, anon;
grant execute on function ecos_unirse_prueba(text) to authenticated;

-- 3. Al crear la cuenta --------------------------------------------------
-- El nombre empieza por «on_auth_user_created_» a proposito: los triggers se
-- disparan en orden alfabetico, y este tiene que ir DESPUES del que crea el
-- perfil (on_auth_user_created).
create or replace function ecos_inscribir_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'whatsapp', '') <> ''
     and coalesce(new.raw_user_meta_data ->> 'profesor', '') <> 'true' then
    begin
      perform ecos_inscribir(new.id, null);
    exception when others then
      -- Nunca se tumba un registro por esto: el panel lo reintenta al entrar.
      raise warning 'ecos_inscribir fallo para %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ecos on auth.users;
create trigger on_auth_user_created_ecos
  after insert on auth.users
  for each row execute function ecos_inscribir_al_registrarse();

-- 4. Los que ya se registraron y quedaron por fuera ----------------------
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

-- Para revisar: quienes estan en su mes gratis y como va el cupo.
select m.name, m.email, m.founder as con_mes_gratis, m.created_at
from ecos_members m
where m.status = 'pendiente'
order by m.created_at desc;

select ecos_founder_spots() as cupo;
