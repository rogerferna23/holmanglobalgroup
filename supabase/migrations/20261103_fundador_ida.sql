-- Ida Ríos, fundadora número 12 (27 oct 2026).
--
-- Pagó la mitad del Programa Fundador (50 de 100; registrado en manual_sales
-- como sale_fund_ida_20261027). Se le abre el programa igual que a Lizmar:
-- activo, 2 sesiones, los 4 pasos, meta de noviembre, plan mixto y su 15%
-- de Fundadora Elite. La cortesía de ECOS la pone sola hgg_programa_sincronizar().
--
-- Se puede correr más de una vez.
-- Se puede correr más de una vez.

insert into hgg_programas (user_id, email, nombre, producto, titulo, etapas, sesiones_total, inicio, estado,
                           meta, meta_fecha, metas, tarjeta, creencias, habilidades)
select u.id, u.email, 'Ida Ríos', 'fundador', 'Programa Fundador',
       array['Meta', 'Pensamientos', 'Habilidades', 'Acción'], 2, date '2026-10-27', 'activo',
       p.meta, p.meta_fecha, p.metas, p.tarjeta, p.creencias, p.habilidades
from auth.users u
cross join lateral (
  select meta, meta_fecha, metas, tarjeta, creencias, habilidades from hgg_programas
  where producto = 'fundador' and nombre ilike 'angelica%' limit 1
) p
where u.email = 'idarios68@yahoo.es'
  and not exists (select 1 from hgg_programas x where x.user_id = u.id and x.producto = 'fundador');

insert into hgg_compromisos (programa_id, texto, fecha_limite)
select p.id, c.texto, c.fecha_limite
from hgg_programas p
cross join (
  select texto, fecha_limite from hgg_compromisos
  where programa_id = (select id from hgg_programas where producto = 'fundador' and nombre ilike 'angelica%' limit 1)
) c
where p.email = 'idarios68@yahoo.es' and p.producto = 'fundador'
  and not exists (select 1 from hgg_compromisos x where x.programa_id = p.id and x.texto = c.texto);

insert into hgg_comision_especial (user_id, pct, motivo)
select id, 15, 'Fundadores Elite' from auth.users where email = 'idarios68@yahoo.es'
on conflict (user_id) do nothing;

-- Para revisar
select p.nombre, p.estado, p.meta, (select count(*) from hgg_compromisos c where c.programa_id = p.id) compromisos,
       (select pct from hgg_comision_especial e where e.user_id = p.user_id) pct,
       (select cortesia_programa from ecos_members m where m.id = p.user_id) cortesia
from hgg_programas p where p.email = 'idarios68@yahoo.es';
