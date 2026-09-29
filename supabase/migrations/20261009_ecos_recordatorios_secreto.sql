-- El secreto de los recordatorios, dentro de la base.
--
-- Antes se copiaba a mano en dos lados (Secrets de la funcion y la tarea
-- programada) y un espacio de mas bastaba para que la funcion respondiera
-- «No autorizado». Ahora se genera aqui, se guarda en una tabla que solo lee
-- service_role (la funcion), y la tarea programada se arma leyendolo. Nadie lo
-- ve ni lo copia.
--
-- Se puede correr mas de una vez: conserva el secreto si ya existe.

create table if not exists ecos_privado (
  key   text primary key,
  value text not null
);
-- Sin politicas: ni visitantes ni miembros la leen. Solo service_role.
alter table ecos_privado enable row level security;
revoke all on ecos_privado from anon, authenticated;

insert into ecos_privado (key, value)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- La tarea diaria, rehecha con el secreto de la tabla.
select cron.unschedule('ecos-recordatorios')
where exists (select 1 from cron.job where jobname = 'ecos-recordatorios');

select cron.schedule(
  'ecos-recordatorios',
  '0 14 * * *',
  format(
    $f$select net.http_post(
      url     := 'https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/ecos-recordatorios',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-ecos-cron', %L),
      body    := '{}'::jsonb
    );$f$,
    (select value from ecos_privado where key = 'cron_secret')
  )
);

-- Para revisar: la tarea quedo programada.
select jobname, schedule, active from cron.job where jobname = 'ecos-recordatorios';
