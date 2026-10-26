-- «Mi agenda» en el panel de ECOS para quien da Sesiones de Claridad (oct 2026).
--
-- Zack no entra a la Torre: entra a su panel de ECOS con su misma cuenta y ve
-- ahí sus citas, anota cómo le fue, marca la etapa de cada persona, copia su
-- enlace de ventas (/agendar?con=zack) y ajusta su horario.
--
-- Quién es anfitrión se sabe por el correo: el de su ficha en
-- hgg_agenda_anfitriones (el mismo con el que entra a ECOS). Nada de esto le
-- abre la Torre ni las citas de otros: todo pasa por estas funciones, que solo
-- devuelven y tocan lo suyo. Requiere 20261031_hgg_agenda_anfitriones.sql.
--
-- Se puede correr más de una vez.

-- Su ficha, o null si quien pregunta no es anfitrión. Holman no la usa (tiene la Torre).
create or replace function hgg_mi_anfitrion()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'id', f.id, 'nombre', f.nombre, 'correo', f.correo, 'tipos', f.tipos,
    'horario', coalesce(f.horario, '{}'::jsonb), 'activo', f.activo,
    'zona', (select zona from hgg_agenda_ajustes where id = 1),
    'tipos_cfg', (select tipos from hgg_agenda_ajustes where id = 1)
  )
  from hgg_agenda_anfitriones f
  where f.id <> 'holman'
    and lower(f.correo) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

-- Sus citas: de hace 60 días en adelante.
create or replace function hgg_mis_citas()
returns setof json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'id', c.id, 'tipo', c.tipo, 'inicio', c.inicio, 'fin', c.fin,
    'nombre', c.nombre, 'email', c.email, 'whatsapp', c.whatsapp,
    'zona_cliente', c.zona_cliente, 'motivo', c.motivo, 'ref_code', c.ref_code,
    'estado', c.estado, 'etapa', c.etapa, 'notas', c.notas, 'zoom_url', c.zoom_url,
    'anfitrion', c.anfitrion, 'created_at', c.created_at
  )
  from hgg_citas c
  join hgg_agenda_anfitriones f on f.id = c.anfitrion
  where f.id <> 'holman'
    and lower(f.correo) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and c.inicio > now() - interval '60 days'
  order by c.inicio;
$$;

-- Anotar una cita suya: cómo fue, en qué etapa va y sus notas. No puede
-- cancelarla ni moverla (eso avisa a la persona y lo hace Holman).
create or replace function hgg_mi_cita_actualizar(p_id uuid, p_estado text, p_etapa text, p_notas text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  select f.id into v_id from hgg_agenda_anfitriones f
  where f.id <> 'holman' and lower(f.correo) = lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_id is null then
    raise exception 'No eres anfitrión de la agenda';
  end if;
  if p_estado not in ('agendada', 'asistio', 'no_asistio') then
    raise exception 'Estado no válido';
  end if;
  if p_etapa not in ('nuevo', 'propuesta', 'cliente', 'descartado') then
    raise exception 'Etapa no válida';
  end if;
  update hgg_citas
     set estado = p_estado, etapa = p_etapa, notas = nullif(trim(coalesce(p_notas, '')), '')
   where id = p_id and anfitrion = v_id and estado <> 'cancelada';
  return found;
end;
$$;

-- Su horario semanal: {"1": [["09:00","12:00"]], …} en la zona de la agenda.
create or replace function hgg_mi_horario_guardar(p_horario jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(p_horario) <> 'object' then
    raise exception 'Horario no válido';
  end if;
  update hgg_agenda_anfitriones
     set horario = p_horario
   where id <> 'holman' and lower(correo) = lower(coalesce(auth.jwt() ->> 'email', ''));
  return found;
end;
$$;

revoke all on function hgg_mi_anfitrion() from public, anon;
revoke all on function hgg_mis_citas() from public, anon;
revoke all on function hgg_mi_cita_actualizar(uuid, text, text, text) from public, anon;
revoke all on function hgg_mi_horario_guardar(jsonb) from public, anon;
grant execute on function hgg_mi_anfitrion() to authenticated;
grant execute on function hgg_mis_citas() to authenticated;
grant execute on function hgg_mi_cita_actualizar(uuid, text, text, text) to authenticated;
grant execute on function hgg_mi_horario_guardar(jsonb) to authenticated;
