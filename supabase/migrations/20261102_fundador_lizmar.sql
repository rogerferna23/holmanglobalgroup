-- Lizmar Fernández (Colombia), la fundadora número 11 (26 oct 2026).
--
-- Compró el Programa Fundador con los demás, pero no tenía cuenta. Ya la
-- creó: se le abre el programa igual que a los otros (activo, 2 sesiones, los
-- 4 pasos), con la meta de noviembre y el plan mixto, y su 15% de Fundadora
-- Elite. La cortesía de ECOS la pone sola hgg_programa_sincronizar().
--
-- Se puede correr más de una vez.

insert into hgg_programas (user_id, email, nombre, producto, titulo, etapas, sesiones_total, inicio, estado,
                           meta, meta_fecha, metas, tarjeta, creencias, habilidades)
select u.id, u.email, 'Lizmar Fernández', 'fundador', 'Programa Fundador',
       array['Meta', 'Pensamientos', 'Habilidades', 'Acción'], 2, date '2026-10-26', 'activo',
       p.meta, p.meta_fecha, p.metas, p.tarjeta, p.creencias, p.habilidades
from auth.users u
cross join lateral (
  select meta, meta_fecha, metas, tarjeta, creencias, habilidades from hgg_programas
  where producto = 'fundador' and nombre ilike 'angelica%' limit 1
) p
where u.id = '893f65ae-4464-4a14-bf7c-fe798abc1d6d'
  and not exists (select 1 from hgg_programas x where x.user_id = u.id and x.producto = 'fundador');

insert into hgg_compromisos (programa_id, texto, fecha_limite)
select p.id, c.texto, c.fecha_limite
from hgg_programas p
cross join (
  select texto, fecha_limite from hgg_compromisos
  where programa_id = (select id from hgg_programas where producto = 'fundador' and nombre ilike 'angelica%' limit 1)
) c
where p.user_id = '893f65ae-4464-4a14-bf7c-fe798abc1d6d' and p.producto = 'fundador'
  and not exists (select 1 from hgg_compromisos x where x.programa_id = p.id and x.texto = c.texto);

insert into hgg_comision_especial (user_id, pct, motivo)
values ('893f65ae-4464-4a14-bf7c-fe798abc1d6d', 15, 'Fundadores Elite')
on conflict (user_id) do nothing;

-- Para revisar
select p.nombre, p.estado, p.meta, (select count(*) from hgg_compromisos c where c.programa_id = p.id) compromisos,
       (select pct from hgg_comision_especial e where e.user_id = p.user_id) pct,
       (select cortesia_programa from ecos_members m where m.id = p.user_id) cortesia
from hgg_programas p where p.user_id = '893f65ae-4464-4a14-bf7c-fe798abc1d6d';
