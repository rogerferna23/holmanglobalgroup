-- Agenda con equipo: la Sesión de Claridad la puede dar Holman o Zack (oct 2026).
--
-- Desde que arrancan los Fundadores Elite, Zack cierra Sentido y Marca con
-- Huella y Holman cierra DelegaWork. Cada uno tiene su horario; la persona ve
-- libre toda hora en la que AL MENOS uno de los dos puede, y la cita queda con
-- quien estaba libre (por orden de preferencia). Después Holman la puede pasar
-- al otro desde Torre → Agenda: se borra el Zoom, se crea el del nuevo
-- anfitrión y la persona recibe el enlace nuevo.
--
-- Cada anfitrión usa SU propio Zoom (para que dos citas a la misma hora no
-- dependan de una sola cuenta): una app Server-to-Server OAuth en su cuenta y
-- sus tres secrets en la función `agenda` — ZOOM_ZACK_ACCOUNT_ID,
-- ZOOM_ZACK_CLIENT_ID, ZOOM_ZACK_CLIENT_SECRET (el id en mayúsculas). Holman
-- sigue con los de siempre, sin prefijo.
--
-- Holman sigue escribiendo SU horario donde siempre (hgg_agenda_ajustes.horario):
-- su fila aquí lo deja en null para no tener dos copias.
--
-- Se puede correr más de una vez.

create extension if not exists btree_gist;

-- --------------------------------------------------------------------------
-- Anfitriones
-- --------------------------------------------------------------------------
create table if not exists hgg_agenda_anfitriones (
  id            text primary key check (id ~ '^[a-z0-9-]{2,32}$'),
  nombre        text not null,
  -- A dónde le llega el aviso de cada cita suya (con la invitación .ics).
  correo        text not null,
  -- Qué sesiones atiende: 'claridad', 'sesion'.
  tipos         text[] not null default array['claridad'],
  -- Su horario semanal en la zona de la agenda; null = el de hgg_agenda_ajustes.
  horario       jsonb,
  -- Plan B mientras no estén sus secrets de Zoom: su sala personal
  -- (https://zoom.us/j/…). Sin ninguno, la cita se guarda sin Zoom y Holman
  -- lo pega en la Torre.
  zoom_fijo     text,
  -- Si hay dos libres a la misma hora, gana el de orden menor.
  orden         int not null default 10,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table hgg_agenda_anfitriones enable row level security;
drop policy if exists hgg_agenda_anfitriones_admin on hgg_agenda_anfitriones;
create policy hgg_agenda_anfitriones_admin on hgg_agenda_anfitriones
  for all using (is_admin()) with check (is_admin());

insert into hgg_agenda_anfitriones (id, nombre, correo, tipos, horario, orden, activo)
select 'holman', 'Holman', correo_avisos, array['claridad', 'sesion'], null, 1, true
from hgg_agenda_ajustes where id = 1
on conflict (id) do nothing;

-- Zack entra apagado: Holman pone su horario y su Zoom y lo activa.
insert into hgg_agenda_anfitriones (id, nombre, correo, tipos, horario, orden, activo)
values ('zack', 'Zack', 'equipo@holmanglobalgroup.com', array['claridad'], '{}'::jsonb, 2, false)
on conflict (id) do nothing;

-- --------------------------------------------------------------------------
-- Cada cita y cada bloqueo es de alguien
-- --------------------------------------------------------------------------
alter table hgg_citas add column if not exists anfitrion text not null default 'holman'
  references hgg_agenda_anfitriones (id);
create index if not exists hgg_citas_anfitrion_idx on hgg_citas (anfitrion, inicio);

-- null = bloquea a todos (vacaciones de la casa); si no, solo a ese anfitrión.
alter table hgg_agenda_bloqueos add column if not exists anfitrion text
  references hgg_agenda_anfitriones (id) on delete cascade;

-- Antes nadie podía tener dos citas a la misma hora; ahora la regla es por
-- anfitrión: Holman y Zack sí pueden atender a la vez.
alter table hgg_citas drop constraint if exists hgg_citas_sin_choque;
alter table hgg_citas add constraint hgg_citas_sin_choque
  exclude using gist (anfitrion with =, tstzrange(inicio, bloque_fin) with &&)
  where (estado <> 'cancelada');

-- Para revisar
select id, nombre, correo, tipos, activo, orden from hgg_agenda_anfitriones order by orden;
