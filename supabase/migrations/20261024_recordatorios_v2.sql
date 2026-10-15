-- Recordatorios, segunda versión (oct 2026).
--
-- Sesiones (agenda): un aviso el día de la sesión (8 a. m. de la persona, o la
-- noche antes si es temprano) y otro 15 minutos antes con el Zoom. Se reusan
-- las columnas aviso_24h (= el del día) y aviso_1h (= el de 15 minutos).
--
-- Clases (ecos-clases): el día antes, 1 hora antes y en punto, con un enlace
-- personal para entrar (ecos-entrar). A Holman le llega en cada momento el
-- texto para el canal de WhatsApp.
--
-- Las dos tareas pasan de cada 15 a cada 5 minutos para que el de 15 minutos
-- y el «en punto» salgan a tiempo.
--
-- ANTES de correr esto: desplegar agenda, ecos-clases y ecos-entrar.
-- Se puede correr más de una vez.

comment on column hgg_citas.aviso_24h is 'Ya salió el aviso del día de la sesión.';
comment on column hgg_citas.aviso_1h  is 'Ya salió el aviso de 15 minutos antes (con el Zoom).';

-- 1. El aviso en punto de las clases ---------------------------------------
alter table ecos_avisos_clase drop constraint if exists ecos_avisos_clase_tipo_check;
alter table ecos_avisos_clase add constraint ecos_avisos_clase_tipo_check
  check (tipo in ('previo', '1hora', 'inicio'));

-- 2. Qué texto del canal ya salió, por clase y momento ----------------------
create table if not exists ecos_avisos_canal (
  session_id text not null references ecos_sessions(id) on delete cascade,
  tipo       text not null check (tipo in ('previo', '1hora', 'inicio')),
  sent_at    timestamptz not null default now(),
  primary key (session_id, tipo)
);
alter table ecos_avisos_canal enable row level security;
revoke all on ecos_avisos_canal from anon, authenticated;

-- 3. Las tareas, cada 5 minutos ---------------------------------------------
select cron.unschedule('ecos-clases')
where exists (select 1 from cron.job where jobname = 'ecos-clases');

select cron.schedule(
  'ecos-clases',
  '*/5 * * * *',
  format(
    $f$select net.http_post(
      url     := 'https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/ecos-clases',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-ecos-cron', %L),
      body    := '{}'::jsonb,
      timeout_milliseconds := 120000
    );$f$,
    (select value from ecos_privado where key = 'cron_secret')
  )
);

select cron.unschedule('hgg-agenda-recordatorios')
where exists (select 1 from cron.job where jobname = 'hgg-agenda-recordatorios');

select cron.schedule(
  'hgg-agenda-recordatorios',
  '*/5 * * * *',
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

select jobname, schedule, active from cron.job where jobname in ('ecos-clases', 'hgg-agenda-recordatorios');
