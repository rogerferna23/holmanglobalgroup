-- Recordatorios del mes gratis: todos los dias a las 10 a. m. (hora del Este)
-- la base llama a la funcion ecos-recordatorios, que decide si toca el de 7
-- dias (25 de octubre) o el de 2 (30 de octubre) y a quien.
--
-- ANTES de correr esto: reemplazar __SECRETO__ por el mismo valor que se pone
-- en Edge Functions → Secrets como ECOS_CRON_SECRET. (El repositorio es
-- publico: aqui va el marcador, nunca el valor.)
--
-- Se puede correr mas de una vez: reemplaza la tarea si ya existe.

-- 1. Que recordatorio se le mando a quien -------------------------------
create table if not exists ecos_recordatorios (
  member_id uuid not null references auth.users(id) on delete cascade,
  tipo      text not null check (tipo in ('7dias', '2dias')),
  sent_at   timestamptz not null default now(),
  primary key (member_id, tipo)
);
-- Solo la funcion (service_role) la toca: sin politicas.
alter table ecos_recordatorios enable row level security;

-- 2. La tarea diaria ----------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('ecos-recordatorios')
where exists (select 1 from cron.job where jobname = 'ecos-recordatorios');

-- 14:00 UTC = 10 a. m. en Miami mientras dure el horario de verano (octubre).
select cron.schedule(
  'ecos-recordatorios',
  '0 14 * * *',
  $$
  select net.http_post(
    url     := 'https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/ecos-recordatorios',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-ecos-cron', '__SECRETO__'),
    body    := '{}'::jsonb
  );
  $$
);

-- Para revisar: la tarea quedo programada.
select jobname, schedule, active from cron.job where jobname = 'ecos-recordatorios';
