-- La base esperaba la respuesta de ecos-clases solo 5 segundos (lo que trae
-- pg_net por defecto). Con 18 miembros, mandar los correos toma ~20 s: la
-- funcion termino igual, pero la llamada quedaba como «timeout». Se le da
-- hasta 2 minutos. Mismo arreglo para ecos-recordatorios.
--
-- Se puede correr mas de una vez.

select cron.unschedule('ecos-clases')
where exists (select 1 from cron.job where jobname = 'ecos-clases');

select cron.schedule(
  'ecos-clases',
  '*/15 * * * *',
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

select cron.unschedule('ecos-recordatorios')
where exists (select 1 from cron.job where jobname = 'ecos-recordatorios');

select cron.schedule(
  'ecos-recordatorios',
  '0 14 * * *',
  format(
    $f$select net.http_post(
      url     := 'https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/ecos-recordatorios',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-ecos-cron', %L),
      body    := '{}'::jsonb,
      timeout_milliseconds := 120000
    );$f$,
    (select value from ecos_privado where key = 'cron_secret')
  )
);

select jobname, schedule, active from cron.job where jobname in ('ecos-clases', 'ecos-recordatorios');
