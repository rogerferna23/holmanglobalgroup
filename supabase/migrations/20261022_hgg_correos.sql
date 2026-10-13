-- Torre → Correos (email marketing con Resend), oct 2026.
--
-- Los contactos, segmentos y envíos viven en Resend; aquí solo la lista de
-- bloqueados: personas que NUNCA reciben marketing, se importe lo que se
-- importe. La función admin-correos la lee antes de agregar un contacto y antes
-- de cada envío (las da de baja en Resend por si alguien las volvió a subir).

create table if not exists hgg_correos_bloqueados (
  email      text primary key check (email = lower(btrim(email)) and email like '%@%'),
  motivo     text,
  created_at timestamptz not null default now()
);

alter table hgg_correos_bloqueados enable row level security;

drop policy if exists "correos_bloqueados_admin" on hgg_correos_bloqueados;
create policy "correos_bloqueados_admin" on hgg_correos_bloqueados
  for all using (is_admin()) with check (is_admin());
