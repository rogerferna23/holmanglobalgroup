-- Los invitados de cada miembro a la masterclass, con nombre (28 oct 2026).
--
-- En «Mi negocio → Invita a la masterclass» el miembro ya veía cuántas
-- personas registró con su enlace (hgg_mis_invitados_masterclass). Ahora ve
-- también quiénes son, para hacerles seguimiento: nombre, WhatsApp, cuándo se
-- registró y si asistió. Solo los suyos (invited_by = auth.uid()); nunca los
-- de otro miembro ni el correo.
--
-- Mismo periodo que el conteo y el ranking: las masterclass que vienen o de hoy.
-- Se puede correr más de una vez.

create or replace function hgg_mis_invitados_masterclass_lista()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(json_build_object(
    'nombre', g.name,
    'whatsapp', g.whatsapp,
    'registrado', g.created_at,
    'asistio', g.attended
  ) order by g.created_at desc), '[]'::json)
  from ecos_guests g
  join ecos_sessions s on s.id = g.session_id
  where g.invited_by = auth.uid() and s.starts_at > now() - interval '1 day';
$$;

revoke all on function hgg_mis_invitados_masterclass_lista() from public, anon;
grant execute on function hgg_mis_invitados_masterclass_lista() to authenticated;
