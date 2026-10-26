-- «Reunión con Holman»: un tercer tipo de cita (26 oct 2026).
--
-- Para cuando Holman quiere reunirse con alguien sin que sea Sesión de
-- Claridad ni de coaching. Solo la da él: su horario, su Zoom. Enlace
-- /reunion. Dura 30 minutos (se cambia en Torre → Agenda → Mi horario).
--
-- Se puede correr más de una vez.

alter table hgg_citas drop constraint if exists hgg_citas_tipo_check;
alter table hgg_citas add constraint hgg_citas_tipo_check
  check (tipo in ('claridad', 'sesion', 'reunion'));

update hgg_agenda_ajustes
   set tipos = tipos || '{"reunion": {"nombre": "Reunión con Holman", "duracion": 30, "bloque": 30, "activo": true}}'::jsonb,
       updated_at = now()
 where id = 1 and not (tipos ? 'reunion');

-- Solo Holman la atiende.
update hgg_agenda_anfitriones
   set tipos = array_append(tipos, 'reunion')
 where id = 'holman' and not ('reunion' = any (tipos));

-- Para revisar
select tipos -> 'reunion' as reunion from hgg_agenda_ajustes where id = 1;
select id, tipos from hgg_agenda_anfitriones order by orden;
