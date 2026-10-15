-- Masterclass como lead magnet (oct 2026).
--
-- La página pública /masterclass (y el enlace de invitado de los miembros,
-- /ecos/invitado) registran por la función ecos-invitado, que manda la
-- confirmación al instante. ecos-clases les manda después sus avisos: el día
-- antes, 1 hora antes y en punto (este último con el Zoom PROPIO de la clase;
-- el Zoom fijo del club nunca va a un invitado).
--
-- ANTES de correr esto: desplegar ecos-invitado y ecos-clases.
-- Se puede correr más de una vez.

-- 1. La zona horaria del invitado (la da su navegador), para sus correos ----
alter table ecos_guests add column if not exists zona text;

-- 2. Un registro por persona y clase ------------------------------------------
create unique index if not exists ecos_guests_sesion_correo_idx
  on ecos_guests (session_id, lower(email));

-- 3. Qué aviso se le mandó a cada invitado ------------------------------------
create table if not exists ecos_avisos_invitado (
  guest_id bigint not null references ecos_guests(id) on delete cascade,
  tipo     text not null check (tipo in ('previo', '1hora', 'inicio')),
  sent_at  timestamptz not null default now(),
  primary key (guest_id, tipo)
);
alter table ecos_avisos_invitado enable row level security;
revoke all on ecos_avisos_invitado from anon, authenticated;
