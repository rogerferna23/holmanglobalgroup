-- «Mi proceso»: el avance de cada cliente de HGG dentro del club (fase 1).
--
-- Decidido con Holman (2026-10-07):
--   · Quien compra un programa (Sentido, Marca, Sistema o el anual) tiene el
--     club incluido mientras su programa este vigente, con descuento y comision
--     de embajador incluidos.
--   · Si un cliente mensual no paga, Holman pone su programa en «pausado»: lo
--     sigue viendo y el club le dura 14 dias mas (la misma gracia de ECOS).
--   · Al terminar el programa le queda un mes de club; despues, la invitacion a
--     quedarse por $47.
--   · Los miembros del club sin programa ven «Mi proceso» con candado.
--
-- Como se da el club: con la cortesia de ECOS, que ya trae acceso, descuento y
-- comision en todas partes (RLS, Edge Functions, panel). La diferencia es que
-- esta se marca con `cortesia_programa` y se pone y se quita sola segun las
-- fechas del programa. Una cortesia que Holman dio a mano nunca se toca.
--
-- Se puede correr mas de una vez.

-- 0. La marca en la ficha del club ------------------------------------------
alter table ecos_members add column if not exists cortesia_programa boolean not null default false;
comment on column ecos_members.cortesia_programa is
  'La cortesia la da un programa de HGG (hgg_programas), no Holman a mano. Se quita sola al vencer.';

-- 1. Tablas ------------------------------------------------------------------
create table if not exists hgg_programas (
  id             text primary key default gen_random_uuid()::text,
  user_id        uuid references auth.users (id) on delete set null,
  email          text not null,
  nombre         text not null,
  -- Id del producto de la tienda (sentido-elite, marca-pro…) u «otro».
  producto       text not null,
  titulo         text not null,
  etapas         text[] not null default array['Claridad', 'Identidad', 'Acción'],
  etapa_actual   int not null default 0,
  -- El resultado concreto que se acordo en la primera sesion.
  meta           text,
  meta_fecha     date,
  sesiones_total int,
  inicio         date not null default current_date,
  estado         text not null default 'activo' check (estado in ('activo', 'pausado', 'terminado')),
  pausado_at     timestamptz,
  terminado_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists hgg_programas_user_idx on hgg_programas (user_id);
create index if not exists hgg_programas_email_idx on hgg_programas (lower(email));

create table if not exists hgg_programa_sesiones (
  id           text primary key default gen_random_uuid()::text,
  programa_id  text not null references hgg_programas (id) on delete cascade,
  fecha        date not null default current_date,
  titulo       text not null,
  resumen      text,
  -- Ruta del acta en el bucket privado «procesos»: <programa_id>/<archivo>.pdf
  acta_path    text,
  created_at   timestamptz not null default now()
);
create index if not exists hgg_programa_sesiones_prog_idx on hgg_programa_sesiones (programa_id, fecha);

create table if not exists hgg_compromisos (
  id            text primary key default gen_random_uuid()::text,
  programa_id   text not null references hgg_programas (id) on delete cascade,
  sesion_id     text references hgg_programa_sesiones (id) on delete set null,
  texto         text not null,
  fecha_limite  date,
  hecho         boolean not null default false,
  hecho_at      timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists hgg_compromisos_prog_idx on hgg_compromisos (programa_id);

create table if not exists hgg_mediciones (
  id           text primary key default gen_random_uuid()::text,
  programa_id  text not null references hgg_programas (id) on delete cascade,
  -- «rueda»: Rueda de la Vida, {area: 1..10} con las areas de lib/test-heridas.
  tipo         text not null default 'rueda',
  fecha        date not null default current_date,
  valores      jsonb not null,
  nota         text,
  created_at   timestamptz not null default now()
);
create index if not exists hgg_mediciones_prog_idx on hgg_mediciones (programa_id, fecha);

drop trigger if exists hgg_programas_updated_at on hgg_programas;
create trigger hgg_programas_updated_at before update on hgg_programas
  for each row execute function set_updated_at();

-- 2. Quien ve que ---------------------------------------------------------
-- Holman (super/admin) todo. El cliente, solo lo suyo y solo para leer: lo
-- unico que escribe es «cumpli este compromiso», por hgg_marcar_compromiso().
alter table hgg_programas         enable row level security;
alter table hgg_programa_sesiones enable row level security;
alter table hgg_compromisos       enable row level security;
alter table hgg_mediciones        enable row level security;

create or replace function hgg_es_mi_programa(p_programa text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from hgg_programas where id = p_programa and user_id = auth.uid());
$$;

drop policy if exists hgg_programas_admin on hgg_programas;
create policy hgg_programas_admin on hgg_programas for all using (is_admin()) with check (is_admin());
drop policy if exists hgg_programas_propio on hgg_programas;
create policy hgg_programas_propio on hgg_programas for select using (user_id = auth.uid());

drop policy if exists hgg_sesiones_admin on hgg_programa_sesiones;
create policy hgg_sesiones_admin on hgg_programa_sesiones for all using (is_admin()) with check (is_admin());
drop policy if exists hgg_sesiones_propio on hgg_programa_sesiones;
create policy hgg_sesiones_propio on hgg_programa_sesiones for select using (hgg_es_mi_programa(programa_id));

drop policy if exists hgg_compromisos_admin on hgg_compromisos;
create policy hgg_compromisos_admin on hgg_compromisos for all using (is_admin()) with check (is_admin());
drop policy if exists hgg_compromisos_propio on hgg_compromisos;
create policy hgg_compromisos_propio on hgg_compromisos for select using (hgg_es_mi_programa(programa_id));

drop policy if exists hgg_mediciones_admin on hgg_mediciones;
create policy hgg_mediciones_admin on hgg_mediciones for all using (is_admin()) with check (is_admin());
drop policy if exists hgg_mediciones_propio on hgg_mediciones;
create policy hgg_mediciones_propio on hgg_mediciones for select using (hgg_es_mi_programa(programa_id));

-- 3. Las actas en PDF: bucket privado ---------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('procesos', 'procesos', false, 15728640, array['application/pdf'])
on conflict (id) do update set
  public             = false,
  file_size_limit    = 15728640,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "procesos_admin_todo" on storage.objects;
create policy "procesos_admin_todo" on storage.objects
  for all to authenticated
  using (bucket_id = 'procesos' and is_admin())
  with check (bucket_id = 'procesos' and is_admin());

drop policy if exists "procesos_cliente_lee" on storage.objects;
create policy "procesos_cliente_lee" on storage.objects
  for select to authenticated
  using (bucket_id = 'procesos' and hgg_es_mi_programa((storage.foldername(name))[1]));

-- 4. El club incluido con el programa -------------------------------------
-- Vigente: activo; pausado hace menos de 14 dias; terminado hace menos de 30.
create or replace function hgg_programa_vigente(p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from hgg_programas
    where user_id = p_user
      and (
        estado = 'activo'
        or (estado = 'pausado'   and coalesce(pausado_at, now())   > now() - interval '14 days')
        or (estado = 'terminado' and coalesce(terminado_at, now()) > now() - interval '30 days')
      )
  );
$$;

-- Pone o quita la cortesia del programa en la ficha del club. Nunca toca una
-- cortesia dada a mano (cortesia sin cortesia_programa).
create or replace function hgg_programa_sincronizar(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row  ecos_members%rowtype;
  v_user auth.users%rowtype;
begin
  if p_user is null then return; end if;
  perform set_config('ecos.sistema', '1', true);

  select * into v_row from ecos_members where id = p_user;

  if hgg_programa_vigente(p_user) then
    if not found then
      select * into v_user from auth.users where id = p_user;
      if not found then return; end if;
      insert into ecos_members (id, email, name, status, cortesia, cortesia_programa)
      values (
        p_user,
        v_user.email,
        coalesce(nullif(trim(v_user.raw_user_meta_data ->> 'name'), ''),
                 (select nombre from hgg_programas where user_id = p_user order by created_at desc limit 1)),
        'pendiente', true, true
      )
      on conflict (id) do update set cortesia = true, cortesia_programa = true
        where not ecos_members.cortesia;
    elsif not v_row.cortesia then
      update ecos_members set cortesia = true, cortesia_programa = true where id = p_user;
    end if;
  elsif found and v_row.cortesia_programa then
    update ecos_members set cortesia = false, cortesia_programa = false where id = p_user;
  end if;
end;
$$;
revoke execute on function hgg_programa_sincronizar(uuid) from public, anon, authenticated;

-- Fechas del estado y cuenta asociada por correo, antes de guardar.
create or replace function hgg_programas_antes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  if new.user_id is null then
    select id into new.user_id from auth.users where lower(email) = new.email limit 1;
  end if;
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    new.pausado_at   := case when new.estado = 'pausado'   then now() else null end;
    new.terminado_at := case when new.estado = 'terminado' then now() else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists hgg_programas_antes on hgg_programas;
create trigger hgg_programas_antes before insert or update on hgg_programas
  for each row execute function hgg_programas_antes();

create or replace function hgg_programas_despues()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform hgg_programa_sincronizar(old.user_id);
    return null;
  end if;
  perform hgg_programa_sincronizar(new.user_id);
  -- Si el programa cambio de cuenta, la anterior puede perder el club.
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform hgg_programa_sincronizar(old.user_id);
  end if;
  return null;
end;
$$;

drop trigger if exists hgg_programas_despues on hgg_programas;
create trigger hgg_programas_despues after insert or update or delete on hgg_programas
  for each row execute function hgg_programas_despues();

-- Quien crea su cuenta despues de que Holman abrio su programa: se asocia
-- por correo. El nombre empieza por «zz» para correr despues de la
-- inscripcion de ECOS (los triggers del mismo evento van en orden alfabetico).
create or replace function hgg_programas_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update hgg_programas set user_id = new.id
  where user_id is null and email = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists zz_hgg_programas_al_registrarse on auth.users;
create trigger zz_hgg_programas_al_registrarse after insert on auth.users
  for each row execute function hgg_programas_al_registrarse();

-- Respaldo desde el panel: si la cuenta ya existia con otro caso de letras o
-- el trigger no alcanzo, el cliente se asocia al abrir «Mi proceso».
create or replace function hgg_vincular_mis_programas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_n     int;
begin
  if auth.uid() is null then return 0; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  update hgg_programas set user_id = auth.uid() where user_id is null and email = v_email;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function hgg_vincular_mis_programas() from public, anon;
grant execute on function hgg_vincular_mis_programas() to authenticated;

-- El cliente marca su compromiso como cumplido (o lo desmarca).
create or replace function hgg_marcar_compromiso(p_id text, p_hecho boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update hgg_compromisos
  set hecho = p_hecho, hecho_at = case when p_hecho then now() else null end
  where id = p_id and hgg_es_mi_programa(programa_id);
  if not found then raise exception 'Ese compromiso no es tuyo.'; end if;
end;
$$;
revoke all on function hgg_marcar_compromiso(text, boolean) from public, anon;
grant execute on function hgg_marcar_compromiso(text, boolean) to authenticated;

-- 5. Las fechas vencen solas: una vez por hora --------------------------------
create or replace function hgg_programas_sincronizar_todos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  for r in
    select distinct user_id from hgg_programas where user_id is not null
    union
    select id from ecos_members where cortesia_programa
  loop
    perform hgg_programa_sincronizar(r.user_id);
  end loop;
end;
$$;
revoke execute on function hgg_programas_sincronizar_todos() from public, anon, authenticated;

select cron.unschedule('hgg-programas') where exists (select 1 from cron.job where jobname = 'hgg-programas');
select cron.schedule('hgg-programas', '7 * * * *', 'select hgg_programas_sincronizar_todos()');
