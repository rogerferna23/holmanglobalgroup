-- ECOS Academy: lista de espera de la Certificación Coach M2H2 (nov 2026).
--
-- La página /academy todavía es oculta (sin enlace, noindex): se comparte a
-- mano con miembros de ECOS, Fundadores Elite y los contactos de Marisol.
-- Cualquiera puede anotarse (insert anónimo); solo el admin lee la lista.
-- Un correo se anota una sola vez: el segundo intento devuelve 23505 y la
-- página lo muestra como «ya estabas en la lista».

create table if not exists hgg_academy_lista (
  id          uuid primary key default gen_random_uuid(),
  programa    text not null default 'coach-m2h2',
  nombre      text not null check (char_length(nombre) between 2 and 120),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp    text not null check (char_length(whatsapp) between 8 and 30),
  -- Por qué quiere certificarse: «ser-coach», «tengo-formacion», «liderar».
  perfil      text,
  ref         text,
  campana     jsonb,
  notas       text,
  created_at  timestamptz not null default now()
);

create unique index if not exists hgg_academy_lista_email
  on hgg_academy_lista (programa, lower(email));

alter table hgg_academy_lista enable row level security;

drop policy if exists "academy lista: cualquiera se anota" on hgg_academy_lista;
create policy "academy lista: cualquiera se anota" on hgg_academy_lista
  for insert to anon, authenticated with check (notas is null);

drop policy if exists "academy lista: admin" on hgg_academy_lista;
create policy "academy lista: admin" on hgg_academy_lista
  for all using (is_admin()) with check (is_admin());

comment on table hgg_academy_lista is
  'Lista de espera de ECOS Academy (/academy). Insert anónimo; lectura solo admin.';
