-- Asistencia automática (28 oct 2026).
--
-- Antes, la asistencia (y sus XP) solo se sumaba si el miembro volvía al
-- panel y tocaba «Asistí» después de la clase: casi nadie lo hacía y «Tu
-- avance» se quedaba quieto. Ahora entrar ES asistir:
--   · el botón «Entrar a la clase» de los correos (ecos-entrar) la registra
--     antes de mandar al Zoom;
--   · el botón de Zoom del panel también (vía ecos_mark_attendance).
-- «Asistí» queda solo como respaldo, para quien entró por otro lado.
--
-- La ventana empieza 15 minutos antes (cuando se abre el enlace) y sigue
-- hasta 36 horas después. Se puede correr más de una vez.

-- La misma lógica de siempre, pero recibe a quién: la llama ecos-entrar con
-- la clave de servicio (el correo no trae sesión). Nadie más puede llamarla.
create or replace function ecos_registrar_asistencia(p_member uuid, p_session text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  s ecos_sessions; pts int; sk text;
begin
  select * into s from ecos_sessions where id = p_session and published;
  if s.id is null then raise exception 'Sesión no encontrada'; end if;
  if now() < s.starts_at - interval '15 minutes' or now() > s.starts_at + interval '36 hours' then
    raise exception 'Esta sesión ya no admite marcar asistencia';
  end if;
  if exists (select 1 from ecos_attendance where member_id = p_member and session_id = s.id) then
    return json_build_object('ok', true, 'already', true);
  end if;
  insert into ecos_attendance (member_id, session_id) values (p_member, s.id);
  pts := ecos_xp_for(s.kind, s.subject);
  if s.kind = 'masterclass' then
    insert into ecos_xp_events (member_id, skill, points, reason, session_id)
    values (p_member, 'ventas', pts, 'masterclass', s.id), (p_member, 'marketing', pts, 'masterclass', s.id), (p_member, 'oratoria', pts, 'masterclass', s.id);
  else
    sk := case when s.subject in ('ventas','marketing','oratoria') then s.subject else 'ventas' end;
    insert into ecos_xp_events (member_id, skill, points, reason, session_id) values (p_member, sk, pts, s.kind, s.id);
  end if;
  perform ecos_refresh_badges(p_member);
  return json_build_object('ok', true, 'points', pts);
end;
$$;

revoke all on function ecos_registrar_asistencia(uuid, text) from public, anon, authenticated;

-- Desde el panel: el propio miembro, con su sesión.
create or replace function ecos_mark_attendance(p_session text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_ecos_member() then raise exception 'Solo miembros activos'; end if;
  return ecos_registrar_asistencia(auth.uid(), p_session);
end;
$$;
