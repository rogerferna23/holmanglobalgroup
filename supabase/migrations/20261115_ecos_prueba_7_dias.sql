-- ============================================
-- MIGRACION: prueba gratis de ECOS de 14 a 7 días (nov 2026)
-- ============================================
--
-- Holman: con 7 días la persona ya vive las cuatro clases de la semana
-- (lunes ventas, martes y jueves oratoria, viernes marketing).
--
-- Solo cambia a quien cree su cuenta desde ahora: quien ya está en su prueba
-- conserva su fecha (prueba_hasta). La usan ecos_prueba_dias() (inscripción)
-- y ecos-checkout (cuándo es el primer cobro).
--
-- Idempotente.

insert into ecos_settings (key, value) values ('prueba_dias', '7')
on conflict (key) do update set value = excluded.value;

-- Esperado: 7
select ecos_prueba_dias() as prueba_dias;
