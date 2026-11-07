-- Mis contactos: el CRM de cada embajador en ECOS → Negocio (nov 2026).
--
-- Cada miembro sube la agenda de su celular (CSV o vCard) y trabaja su lista:
-- si es persona o empresa, qué le va a regalar (beneficio, texto libre), en
-- qué estado va y si el número sigue activo. Cada fila es de su dueño y solo
-- él la ve: ni otros miembros ni el admin (son sus contactos personales).

create table if not exists ecos_contactos (
  id               text primary key default gen_random_uuid()::text,
  owner            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre           text not null,
  telefono         text,
  -- 'persona' o 'empresa'; null = sin definir.
  tipo             text check (tipo in ('persona', 'empresa')),
  -- Qué le vas a dar para abrir la conversación (semana en el club, Sesión de Claridad, podcast…).
  beneficio        text,
  estado           text not null default 'sin_contactar'
                   check (estado in ('sin_contactar', 'escrito', 'interesado', 'dudas', 'no_entendio', 'no_ahora', 'compro')),
  -- false = cambió de número o ya no tiene WhatsApp: queda en gris.
  activo           boolean not null default true,
  notas            text,
  ultimo_contacto  timestamptz,
  origen           text not null default 'manual' check (origen in ('manual', 'agenda')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists ecos_contactos_owner_idx on ecos_contactos (owner, created_at);

alter table ecos_contactos enable row level security;
drop policy if exists ecos_contactos_propios on ecos_contactos;
create policy ecos_contactos_propios on ecos_contactos for all
  using (owner = auth.uid()) with check (owner = auth.uid());
