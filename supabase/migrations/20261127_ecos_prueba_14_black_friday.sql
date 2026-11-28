-- ============================================
-- MIGRACION: prueba gratis de ECOS a 14 días por Black Friday (27 nov 2026)
-- ============================================
--
-- Holman: los flyers de Black Friday regalan 14 días del club (hasta el lunes
-- 30 de noviembre). Desde el 1 de diciembre vuelve a 7
-- (20261115_ecos_prueba_7_dias.sql) junto con ECOS.pruebaDias en src/lib/ecos.ts.
--
-- Solo cambia a quien cree su cuenta desde ahora: quien ya está en su prueba
-- conserva su fecha (prueba_hasta). La usan ecos_prueba_dias() (inscripción)
-- y ecos-checkout (cuándo es el primer cobro).
--
-- Idempotente.

insert into ecos_settings (key, value) values ('prueba_dias', '14')
on conflict (key) do update set value = excluded.value;

-- Esperado: 14
select ecos_prueba_dias() as prueba_dias;
