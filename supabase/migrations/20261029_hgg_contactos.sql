-- Contactos: el CRM sencillo de Holman en Torre → Clientes (oct 2026).
--
-- Una fila por persona a contactar, con su grupo (a quién se le ofrece el
-- Programa Fundador y a quién el resto), la etapa en que va, la próxima
-- acción y notas. Solo la ve y la toca el admin.

create table if not exists hgg_contactos (
  id               text primary key default gen_random_uuid()::text,
  nombre           text not null,
  telefono         text,
  -- 'fundador' = se le ofrece el Programa Fundador (USD 100/mes); 'general' = Claridad, ECOS y lo demás.
  grupo            text not null default 'general' check (grupo in ('fundador', 'general')),
  etapa            text not null default 'por_contactar'
                   check (etapa in ('por_contactar', 'contactado', 'conversando', 'claridad', 'cerrado', 'no_ahora')),
  proximo          date,
  notas            text,
  ultimo_contacto  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists hgg_contactos_etapa_idx on hgg_contactos (etapa);

alter table hgg_contactos enable row level security;
drop policy if exists hgg_contactos_admin on hgg_contactos;
create policy hgg_contactos_admin on hgg_contactos for all using (is_admin()) with check (is_admin());

-- La primera lista (19 oct 2026). Si se corre dos veces, no duplica.
insert into hgg_contactos (nombre, grupo)
select v.nombre, v.grupo
from (values
  ('Marta Simbaqueba', 'fundador'), ('Angie Ecuador', 'fundador'), ('Genaro México', 'fundador'),
  ('Dennise', 'fundador'), ('Evelyn', 'fundador'), ('Ceci Baltier', 'fundador'),
  ('Dani Domínguez', 'fundador'), ('Sabine', 'fundador'), ('Valeria Aponte', 'fundador'),
  ('Diana Fusa', 'general'), ('Ingrid', 'general'), ('Adriana MB', 'general'), ('Alejo de Nicole', 'general'),
  ('Berto', 'general'), ('Bryan Anaya', 'general'), ('Camilo Medina', 'general'), ('Carlos Arturo Uber', 'general'),
  ('Claudia Rengifo', 'general'), ('Darling Ávila', 'general'), ('Diana Garduño', 'general'),
  ('Dianis Más móvil', 'general'), ('Carlos Erazo', 'general'), ('Eli Hooper', 'general'), ('Estefa', 'general'),
  ('Felipe Action', 'general'), ('Fener Leal', 'general'), ('Fulvia', 'general'), ('Germán Uber', 'general'),
  ('Gis MB', 'general'), ('Grace Medina', 'general'), ('Ida Rios', 'general'), ('Ildimar', 'general'),
  ('Iris Rios', 'general'), ('Isa Mejía', 'general'), ('Jair Loaiza', 'general'), ('Jenny Palacios', 'general'),
  ('Joaco', 'general'), ('Johana Bogotá', 'general'), ('Jordano', 'general'), ('José Pérez', 'general'),
  ('Justo', 'general'), ('Kathe Rojas', 'general'), ('Leticia Cruz', 'general'), ('Lina Poveda', 'general'),
  ('Lizmar', 'general'), ('Maritza Quintero', 'general'), ('Osnelys', 'general'), ('Pascual', 'general'),
  ('Paulo LLC', 'general'), ('Pepe Bazalar', 'general'), ('Psicóloga del Corazoncito', 'general'),
  ('Ricardo del Angel', 'general'), ('Samir', 'general'), ('Sara Castillo', 'general'), ('Zebash', 'general'),
  ('Tao 4k', 'general'), ('Yesid', 'general'), ('Ludwig', 'general'), ('Mireya', 'general'),
  ('Natali', 'general'), ('Wilson', 'general')
) as v (nombre, grupo)
where not exists (select 1 from hgg_contactos c where lower(c.nombre) = lower(v.nombre));
