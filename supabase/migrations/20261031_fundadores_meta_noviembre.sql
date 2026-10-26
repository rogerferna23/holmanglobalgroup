-- Fundadores Elite: todos arrancan con la misma meta (26 oct 2026).
--
-- Holman decidió que, aunque cada uno le mandó su número, el primer escalón
-- es igual para los diez: USD 1.000 de ingreso (comisión) en noviembre de
-- 2026. Al 15% eso son ~USD 6.700 en ventas de HGG. Cuando lo logren, se
-- sube la meta de cada uno desde Torre → Clientes.
--
-- La meta y su fecha se escriben siempre. Los pasos 1 a 3 (metas pequeñas,
-- tarjeta, creencias, habilidades) solo si están vacíos, para no pisar lo que
-- Holman ya haya escrito. Los compromisos de la primera semana se agregan una
-- sola vez. Se puede correr más de una vez.

update hgg_programas set
  meta = 'Generar USD 1.000 en noviembre recomendando a HGG',
  meta_fecha = date '2026-11-30',
  metas = case when metas = '[]'::jsonb then jsonb_build_array(
    jsonb_build_object('texto', 'Mi lista de 30 personas a las que les puede servir HGG', 'fecha', '2026-11-02', 'hecha', false),
    jsonb_build_object('texto', '4 Sesiones de Claridad agendadas con mi enlace', 'fecha', '2026-11-08', 'hecha', false),
    jsonb_build_object('texto', 'Mi primera venta cerrada', 'fecha', '2026-11-15', 'hecha', false),
    jsonb_build_object('texto', 'USD 500 acumulados', 'fecha', '2026-11-22', 'hecha', false),
    jsonb_build_object('texto', 'USD 1.000', 'fecha', '2026-11-30', 'hecha', false)
  ) else metas end,
  tarjeta = coalesce(tarjeta,
    'Es 30 de noviembre de 2026 y ya generé USD 1.000 ayudando a otras personas a encontrar claridad, una marca que vende y un sistema para su negocio. Lo logré conversando con intención cada día.'),
  creencias = case when creencias = '[]'::jsonb then jsonb_build_array(
    jsonb_build_object('antes', 'Vender es molestar a la gente', 'ahora', 'Recomendar es regalarle a alguien su siguiente paso'),
    jsonb_build_object('antes', 'No conozco a suficientes personas', 'ahora', 'Mi lista crece con cada conversación')
  ) else creencias end,
  habilidades = case when habilidades = '[]'::jsonb then jsonb_build_array(
    jsonb_build_object('nombre', 'Preguntar antes de ofrecer', 'nivel', 2),
    jsonb_build_object('nombre', 'Invitar a la Sesión de Claridad', 'nivel', 2),
    jsonb_build_object('nombre', 'Hacer seguimiento', 'nivel', 2)
  ) else habilidades end,
  updated_at = now()
where producto = 'fundador';

-- Acción: los compromisos de la primera semana (del 2 al 8 de noviembre).
insert into hgg_compromisos (programa_id, texto, fecha_limite)
select p.id, c.texto, c.fecha
from hgg_programas p
cross join (values
  ('Escribir mi lista de 30 personas a las que les puede servir HGG', date '2026-11-02'),
  ('Tener 11 conversaciones con intención esta semana (2 por día)', date '2026-11-08'),
  ('Lograr 4 Sesiones de Claridad agendadas con mi enlace', date '2026-11-08'),
  ('Leer mi tarjeta al despertar y antes de dormir', date '2026-11-08')
) as c (texto, fecha)
where p.producto = 'fundador'
  and not exists (select 1 from hgg_compromisos x where x.programa_id = p.id and x.texto = c.texto);

-- Para revisar
select nombre, meta, meta_fecha, jsonb_array_length(metas) as metas,
       (select count(*) from hgg_compromisos x where x.programa_id = p.id) as compromisos
from hgg_programas p where producto = 'fundador' order by nombre;
