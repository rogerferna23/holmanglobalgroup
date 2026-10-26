-- Programa de MUESTRA en la cuenta de Holman (26 oct 2026).
--
-- Holman entra a su panel de ECOS con «Ver como miembro» para mostrarles a
-- los Fundadores Elite cómo se ve todo. Sin programa, «Mi proceso» sale con
-- candado. Se le abre un Programa Fundador de muestra con el mismo plan de
-- noviembre que tienen ellos, y el 15% de Fundador Elite solo hasta el 28 de
-- octubre (para la reunión), así su panel dice lo mismo que el de ellos.
--
-- Ojo: es producto 'fundador'. Cualquier migración futura que recorra a los
-- fundadores debe excluir a 'holmanorjuelab@gmail.com'. Para quitarla:
--   delete from hgg_programas where email = 'holmanorjuelab@gmail.com' and nombre like '%(muestra)%';
--
-- Se puede correr más de una vez.

insert into hgg_programas (user_id, email, nombre, producto, titulo, etapas, sesiones_total, inicio, estado,
                           meta, meta_fecha, metas, tarjeta, creencias, habilidades)
select u.id, u.email, 'Holman Orjuela (muestra)', 'fundador', 'Programa Fundador',
       array['Meta', 'Pensamientos', 'Habilidades', 'Acción'], 2, date '2026-10-26', 'activo',
       p.meta, p.meta_fecha, p.metas, p.tarjeta, p.creencias, p.habilidades
from auth.users u
cross join lateral (
  select meta, meta_fecha, metas, tarjeta, creencias, habilidades from hgg_programas
  where producto = 'fundador' and nombre ilike 'angelica%' limit 1
) p
where lower(u.email) = 'holmanorjuelab@gmail.com'
  and not exists (select 1 from hgg_programas x where x.user_id = u.id);

insert into hgg_compromisos (programa_id, texto, fecha_limite)
select p.id, c.texto, c.fecha_limite
from hgg_programas p
cross join (
  select texto, fecha_limite from hgg_compromisos
  where programa_id = (select id from hgg_programas where producto = 'fundador' and nombre ilike 'angelica%' limit 1)
) c
where lower(p.email) = 'holmanorjuelab@gmail.com' and p.nombre like '%(muestra)%'
  and not exists (select 1 from hgg_compromisos x where x.programa_id = p.id and x.texto = c.texto);

insert into hgg_comision_especial (user_id, pct, motivo, hasta)
select id, 15, 'Muestra para la reunión de Fundadores Elite', timestamptz '2026-10-28 00:00:00-05'
from auth.users where lower(email) = 'holmanorjuelab@gmail.com'
on conflict (user_id) do nothing;

-- Para revisar
select p.nombre, p.meta, (select count(*) from hgg_compromisos c where c.programa_id = p.id) compromisos,
       (select pct || ' hasta ' || hasta from hgg_comision_especial e where e.user_id = p.user_id) pct
from hgg_programas p where lower(p.email) = 'holmanorjuelab@gmail.com';
