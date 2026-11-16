-- Recordatorio «hoy termina» de ECOS (4 nov 2026): además de los de 7 y 2 días,
-- ecos-recordatorios manda uno el mismo día del final de la prueba. La tabla
-- que guarda qué se envió a quién acepta el tipo nuevo.

alter table ecos_recordatorios drop constraint if exists ecos_recordatorios_tipo_check;
alter table ecos_recordatorios
  add constraint ecos_recordatorios_tipo_check check (tipo in ('7dias', '2dias', 'hoy'));
