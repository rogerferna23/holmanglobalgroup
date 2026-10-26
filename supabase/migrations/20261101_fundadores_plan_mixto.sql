-- Fundadores Elite: el plan mixto para los USD 1.000 de noviembre (26 oct 2026).
--
-- Holman eligió la ruta mixta: negocios con DelegaWork (Starter $647 y Pro
-- $1.295, 15% cada mes), personas con Sentido Elite y Marca con Huella Pro o
-- Elite (15% una vez) y el club (10% de $47 por miembro, cada mes).
--
-- El mes de un fundador: 21 Sesiones de Claridad (12 de negocios con Holman,
-- 9 de personas con Zack) → 2 DelegaWork Starter + 1 Pro + 2 Sentido Elite +
-- 1 Marca Pro + 10 miembros de ECOS ≈ USD 1.004.
--
-- Reemplaza las metas pequeñas y los compromisos de la semana 1 que dejó
-- 20261031_fundadores_meta_noviembre.sql, solo si siguen tal cual (si Holman
-- ya los cambió a mano, no se tocan). Se puede correr más de una vez.

update hgg_programas set
  meta = 'Generar USD 1.000 en noviembre: 3 negocios con DelegaWork, 3 personas y 10 miembros de ECOS',
  metas = jsonb_build_array(
    jsonb_build_object('texto', 'Mi lista de 20 negocios y 20 personas a las que les puede servir HGG', 'fecha', '2026-11-02', 'hecha', false),
    jsonb_build_object('texto', 'Semana 1: 5 Sesiones de Claridad agendadas con mi enlace', 'fecha', '2026-11-08', 'hecha', false),
    jsonb_build_object('texto', 'Semana 2: 6 Claridades · 1 DelegaWork Starter + 1 Sentido Elite (~USD 247)', 'fecha', '2026-11-15', 'hecha', false),
    jsonb_build_object('texto', 'Semana 3: 6 Claridades · 1 Starter + 1 Marca Pro e invitar a ECOS a quien no compró (~USD 613)', 'fecha', '2026-11-22', 'hecha', false),
    jsonb_build_object('texto', 'Semana 4: 4 Claridades · 1 DelegaWork Pro + 1 Sentido Elite + 10 en ECOS (USD 1.000)', 'fecha', '2026-11-30', 'hecha', false)
  ),
  updated_at = now()
where producto = 'fundador'
  and metas -> 0 ->> 'texto' = 'Mi lista de 30 personas a las que les puede servir HGG';

-- Semana 1: fuera los compromisos viejos que nadie ha marcado, entran los nuevos.
delete from hgg_compromisos c
using hgg_programas p
where c.programa_id = p.id and p.producto = 'fundador' and not c.hecho
  and c.texto in (
    'Escribir mi lista de 30 personas a las que les puede servir HGG',
    'Tener 11 conversaciones con intención esta semana (2 por día)',
    'Lograr 4 Sesiones de Claridad agendadas con mi enlace'
  );

insert into hgg_compromisos (programa_id, texto, fecha_limite)
select p.id, c.texto, c.fecha
from hgg_programas p
cross join (values
  ('Escribir mi lista de 20 negocios y 20 personas a las que les puede servir HGG', date '2026-11-02'),
  ('Tener 16 conversaciones esta semana (3 por día)', date '2026-11-08'),
  ('Lograr 5 Sesiones de Claridad agendadas con mi enlace', date '2026-11-08')
) as c (texto, fecha)
where p.producto = 'fundador'
  and not exists (select 1 from hgg_compromisos x where x.programa_id = p.id and x.texto = c.texto);

-- Para revisar
select nombre, meta, metas -> 1 ->> 'texto' as semana_1,
       (select string_agg(texto, ' · ' order by fecha_limite, texto) from hgg_compromisos x where x.programa_id = p.id) as compromisos
from hgg_programas p where producto = 'fundador' order by nombre;
