-- Agenda propia de HGG: reemplaza a DelegaMeet (oct 2026).
--
-- Holman pone su horario semanal en Torre → Agenda; la persona elige una hora
-- libre en /agendar (Sesión de Claridad) o /sesion (sesión de coaching), la ve
-- en la hora de su país, y al reservar le llega el enlace de Zoom.
--
-- Todo lo público pasa por la función `agenda` (service_role): calcula las
-- horas libres, reserva, crea el Zoom, manda los correos y cancela. El
-- navegador nunca lee ni escribe estas tablas directo; solo los admins, desde
-- la Torre, por RLS.
--
-- Se puede correr más de una vez.

-- --------------------------------------------------------------------------
-- Ajustes: una sola fila.
-- --------------------------------------------------------------------------
create table if not exists hgg_agenda_ajustes (
  id            int primary key default 1 check (id = 1),
  -- La zona en la que Holman escribe su horario.
  zona          text not null default 'America/Bogota',
  -- Por día de la semana ISO (1 = lunes … 7 = domingo): tramos ["HH:MM","HH:MM"].
  horario       jsonb not null default '{
    "1": [["09:00","12:00"],["14:00","18:00"]],
    "2": [["09:00","12:00"],["14:00","18:00"]],
    "3": [["09:00","12:00"],["14:00","18:00"]],
    "4": [["09:00","12:00"],["14:00","18:00"]],
    "5": [["09:00","12:00"],["14:00","18:00"]]
  }'::jsonb,
  -- Cuánto antes como mínimo se puede reservar, y hasta cuántos días adelante.
  aviso_horas   int not null default 12 check (aviso_horas between 0 and 168),
  dias_adelante int not null default 21 check (dias_adelante between 1 and 90),
  -- Lo que ve la persona (duracion) y lo que se aparta en la agenda (bloque):
  -- la Claridad dura 30 min, pero se aparta la hora entera para dar margen.
  tipos         jsonb not null default '{
    "claridad": {"nombre": "Sesión de Claridad", "duracion": 30, "bloque": 60, "activo": true},
    "sesion":   {"nombre": "Sesión de coaching", "duracion": 60, "bloque": 60, "activo": true}
  }'::jsonb,
  -- A dónde llega el aviso de cada reserva (con la invitación de calendario).
  correo_avisos text not null default 'equipo@holmanglobalgroup.com',
  updated_at    timestamptz not null default now()
);

insert into hgg_agenda_ajustes (id) values (1) on conflict (id) do nothing;

alter table hgg_agenda_ajustes enable row level security;
drop policy if exists hgg_agenda_ajustes_admin on hgg_agenda_ajustes;
create policy hgg_agenda_ajustes_admin on hgg_agenda_ajustes
  for all using (is_admin()) with check (is_admin());

-- --------------------------------------------------------------------------
-- Bloqueos: vacaciones, un día ocupado, una tarde con otra cosa.
-- --------------------------------------------------------------------------
create table if not exists hgg_agenda_bloqueos (
  id         uuid primary key default gen_random_uuid(),
  desde      timestamptz not null,
  hasta      timestamptz not null,
  motivo     text,
  created_at timestamptz not null default now(),
  check (hasta > desde)
);

alter table hgg_agenda_bloqueos enable row level security;
drop policy if exists hgg_agenda_bloqueos_admin on hgg_agenda_bloqueos;
create policy hgg_agenda_bloqueos_admin on hgg_agenda_bloqueos
  for all using (is_admin()) with check (is_admin());

-- --------------------------------------------------------------------------
-- Citas: cada reserva, y lo que Holman anota de cada persona (mini-CRM).
-- --------------------------------------------------------------------------
create table if not exists hgg_citas (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('claridad', 'sesion')),
  inicio        timestamptz not null,
  -- Fin de la sesión (lo que ve la persona) y fin de lo que se aparta.
  fin           timestamptz not null,
  bloque_fin    timestamptz not null,
  nombre        text not null,
  email         text not null,
  whatsapp      text,
  -- La zona del navegador de quien reservó: sus correos van en su hora.
  zona_cliente  text,
  motivo        text,
  -- Quién la trajo: el código tal cual y el embajador al que corresponde.
  ref_code      text,
  referrer      uuid references auth.users (id) on delete set null,
  estado        text not null default 'agendada'
                check (estado in ('agendada', 'asistio', 'no_asistio', 'cancelada')),
  etapa         text not null default 'nuevo'
                check (etapa in ('nuevo', 'propuesta', 'cliente', 'descartado')),
  notas         text,
  zoom_id       text,
  zoom_url      text,
  -- Para que la persona cancele desde su correo sin cuenta.
  token         text not null default replace(gen_random_uuid()::text, '-', ''),
  aviso_24h     boolean not null default false,
  aviso_1h      boolean not null default false,
  cancelada_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (fin > inicio and bloque_fin >= fin)
);

create index if not exists hgg_citas_inicio_idx on hgg_citas (inicio);
create unique index if not exists hgg_citas_token_idx on hgg_citas (token);
create index if not exists hgg_citas_email_idx on hgg_citas (lower(email));

-- Dos reservas vivas nunca se pisan, aunque lleguen en el mismo segundo.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hgg_citas_sin_choque') then
    alter table hgg_citas add constraint hgg_citas_sin_choque
      exclude using gist (tstzrange(inicio, bloque_fin) with &&) where (estado <> 'cancelada');
  end if;
end $$;

create or replace function hgg_citas_tocar() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.estado = 'cancelada' and old.estado is distinct from 'cancelada' then
    new.cancelada_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists hgg_citas_tocar on hgg_citas;
create trigger hgg_citas_tocar before update on hgg_citas
  for each row execute function hgg_citas_tocar();

alter table hgg_citas enable row level security;
drop policy if exists hgg_citas_admin on hgg_citas;
create policy hgg_citas_admin on hgg_citas
  for all using (is_admin()) with check (is_admin());

-- --------------------------------------------------------------------------
-- Recordatorios: cada 15 minutos la base le pide a la función que avise a
-- quien tiene sesión en 24 horas o en una hora. Mismo secreto que los avisos
-- de ECOS (ecos_privado.cron_secret).
-- --------------------------------------------------------------------------
select cron.unschedule('hgg-agenda-recordatorios')
where exists (select 1 from cron.job where jobname = 'hgg-agenda-recordatorios');

select cron.schedule(
  'hgg-agenda-recordatorios',
  '*/15 * * * *',
  format(
    $f$select net.http_post(
      url     := 'https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/agenda',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-ecos-cron', %L),
      body    := '{"accion":"recordatorios"}'::jsonb,
      timeout_milliseconds := 120000
    );$f$,
    (select value from ecos_privado where key = 'cron_secret')
  )
);

select jobname, schedule, active from cron.job where jobname = 'hgg-agenda-recordatorios';
