-- Cada anfitrión escribe su horario en SU hora (26 oct 2026).
--
-- Holman escribe el suyo en hora de Bogotá; Zack vive en Argentina y escribe
-- el suyo en hora de Buenos Aires. La agenda convierte cada horario a
-- instantes reales y la persona que agenda lo ve en la hora de su país.
-- null = la zona de la agenda (hgg_agenda_ajustes.zona, Bogotá).
--
-- Se puede correr más de una vez.

alter table hgg_agenda_anfitriones add column if not exists zona text;

update hgg_agenda_anfitriones set zona = 'America/Argentina/Buenos_Aires'
where id = 'zack' and zona is null;

-- «Mi agenda» le muestra a cada uno su horario en su hora.
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
    'zona', coalesce(f.zona, (select zona from hgg_agenda_ajustes where id = 1)),
    'tipos_cfg', (select tipos from hgg_agenda_ajustes where id = 1)
  )
  from hgg_agenda_anfitriones f
  where f.id <> 'holman'
    and lower(f.correo) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

-- Para revisar
select id, zona, horario from hgg_agenda_anfitriones order by orden;
