-- El primer cobro de los fundadores pasa del 1 al jueves 5 de noviembre.
--
-- Por que (decidido 2026-10-07): la masterclass es el lunes 2 de noviembre y el
-- 31 de octubre es fin de semana de Halloween. Con el 5, los fundadores viven la
-- masterclass con acceso completo y pagan despues. Los recordatorios ya
-- programados (ecos-recordatorios, 7 y 2 dias antes) se recalculan solos con
-- esta fecha: llegan el 29 de octubre y el 3 de noviembre.
--
-- Ademas, quien entra como fundador a pocos dias del cobro recibe tambien sus
-- 14 dias de prueba (vale la fecha mayor), para que nadie quede con menos que
-- los demas.
--
-- Se puede correr mas de una vez. Despues de correrla:
--   1. Desplegar ecos-checkout, ecos-recordatorios, ecos-bienvenida y
--      ecos-clases (solo cambia su fecha de respaldo).
--   2. Quien YA activo con tarjeta tiene en Stripe el cobro el 1 de noviembre:
--      la consulta del final los lista. En Stripe → Suscripciones → la de cada
--      uno → Actualizar → fin de la prueba = 5 nov 2026, 12:00 p. m. (Nueva York).

-- 1. La fecha ------------------------------------------------------------
insert into ecos_settings (key, value) values ('trial_end', '2026-11-05T12:00:00-05:00')
on conflict (key) do update set value = excluded.value;

-- 2. La inscripcion: fundadores tambien con sus 14 dias --------------------
create or replace function ecos_inscribir(p_uid uuid, p_ref text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   auth.users%rowtype;
  v_md     jsonb;
  v_row    ecos_members%rowtype;
  v_cupo   boolean;
  v_ref    uuid;
  v_existe boolean;
  v_hasta  timestamptz;
begin
  if p_uid is null then return; end if;

  -- De a uno: que dos registros al mismo tiempo no se pasen del cupo.
  perform pg_advisory_xact_lock(hashtext('ecos_unirse_prueba'));

  select * into v_row from ecos_members where id = p_uid;
  -- Se guarda YA: un PERFORM posterior pisa FOUND.
  v_existe := found;
  -- Una sola prueba por cuenta: quien ya la tuvo (o ya activo) no recibe otra.
  if v_existe and (v_row.founder or v_row.prueba_hasta is not null or v_row.status <> 'pendiente'
                   or v_row.stripe_subscription_id is not null) then
    return;
  end if;

  -- Fundador mientras haya cupo y no haya pasado la fecha. Todos (fundadores
  -- tambien) reciben ademas sus 14 dias: quien entra como fundador a pocos dias
  -- del cobro no se queda con menos prueba que los demas. Vale la fecha mayor.
  v_cupo := now() < ecos_trial_end() and (ecos_founder_spots() ->> 'left')::int > 0;
  v_hasta := now() + make_interval(days => ecos_prueba_dias());
  perform set_config('ecos.sistema', '1', true);

  if v_existe then
    update ecos_members set founder = v_cupo, prueba_hasta = v_hasta where id = p_uid;
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
    (id, email, name, whatsapp, city, country, business, goal, show_in_directory, status, founder, prueba_hasta, referred_by)
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
    v_hasta,
    v_ref
  )
  on conflict (id) do nothing;
end;
$$;

revoke execute on function ecos_inscribir(uuid, text) from public, anon, authenticated;

-- 3. Fundadores que ya registraron tarjeta (mover su cobro en Stripe) -------
select name, email, status, plan, stripe_subscription_id
from ecos_members
where founder
  and stripe_subscription_id is not null
  and coalesce(plan, 'mensual') = 'mensual'
order by name;
