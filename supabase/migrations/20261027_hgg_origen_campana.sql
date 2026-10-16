-- =====================================================================
-- Origen de campaña en los registros a la masterclass y en las citas
-- (oct 2026, tablero de números).
--
-- ECOS ya guarda la campaña de cada cuenta (ecos_members.campana, migración
-- 20261014). Para que el tablero de /torre diga de qué campaña viene cada
-- paso del embudo, los invitados a la masterclass y las citas también la
-- guardan. La escriben solo las funciones ecos-invitado y agenda (service
-- role); si esta migración no ha corrido, ellas guardan igual sin el dato.
--
-- Idempotente: se puede correr más de una vez.
-- =====================================================================

alter table ecos_guests add column if not exists campana jsonb;
alter table hgg_citas   add column if not exists campana jsonb;

comment on column ecos_guests.campana is
  'Campaña pagada por la que llegó (utm_source, utm_medium, utm_campaign, utm_content, clic). Null = orgánico o embajador.';
comment on column hgg_citas.campana is
  'Campaña pagada por la que llegó (utm_source, utm_medium, utm_campaign, utm_content, clic). Null = orgánico o embajador.';
