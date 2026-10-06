-- Avisos de clase: cada 15 minutos la base llama a la funcion ecos-clases,
-- que decide si a alguna clase publicada le toca el aviso del dia antes
-- («previo») o el de una hora antes («1hora»), y a quien.
--
-- Usa el mismo secreto de ecos-recordatorios (tabla ecos_privado, migracion
-- 20261009): nadie lo copia a mano.
--
-- ANTES de correr esto: desplegar la funcion
--   npx supabase functions deploy ecos-clases --no-verify-jwt --project-ref ugaqokaqxyvuecyfcgso
--
-- Se puede correr mas de una vez: reemplaza la tarea si ya existe.

-- 1. Que aviso se le mando a quien, por clase -----------------------------
create table if not exists ecos_avisos_clase (
  session_id text not null references ecos_sessions(id) on delete cascade,
  member_id  uuid not null references auth.users(id) on delete cascade,
  tipo       text not null check (tipo in ('previo', '1hora')),
  sent_at    timestamptz not null default now(),
  primary key (session_id, member_id, tipo)
);
-- Solo la funcion (service_role) la toca: sin politicas.
alter table ecos_avisos_clase enable row level security;
revoke all on ecos_avisos_clase from anon, authenticated;

-- 2. La tarea, cada 15 minutos --------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('ecos-clases')
where exists (select 1 from cron.job where jobname = 'ecos-clases');

select cron.schedule(
  'ecos-clases',
  '*/15 * * * *',
  format(
    $f$select net.http_post(
      url     := 'https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/ecos-clases',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-ecos-cron', %L),
      body    := '{}'::jsonb
    );$f$,
    (select value from ecos_privado where key = 'cron_secret')
  )
);

-- Para revisar: la tarea quedo programada.
select jobname, schedule, active from cron.job where jobname = 'ecos-clases';

-- Para revisar: las clases que vienen y a que hora salen.
select id,
       to_char(starts_at at time zone 'America/New_York', 'Dy DD Mon HH12:MI AM') as "hora Miami",
       kind, subject, teacher, published
from ecos_sessions
where starts_at > now() and starts_at < now() + interval '8 days'
order by starts_at;

-- Para probar (opcional): manda los dos correos de ejemplo con la proxima
-- clase a un solo correo. Cambiar el correo y correr esta linea sola.
-- select net.http_post(
--   url     := 'https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/ecos-clases',
--   headers := jsonb_build_object('Content-Type', 'application/json', 'x-ecos-cron', (select value from ecos_privado where key = 'cron_secret')),
--   body    := '{"probar": "tu-correo@ejemplo.com"}'::jsonb
-- );
