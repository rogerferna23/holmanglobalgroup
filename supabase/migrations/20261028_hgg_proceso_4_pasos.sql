-- «Mi proceso» en 4 pasos: Meta · Pensamientos · Habilidades · Acción (oct 2026).
--
-- Inspirado en «El secreto más extraño» (Earl Nightingale): una meta escrita,
-- leída cada mañana y cada noche, partida en metas pequeñas y llevada a la
-- acción diaria. La meta a 90 días (meta, meta_fecha) y los compromisos
-- (hgg_compromisos = la acción) ya existían; aquí se agrega lo que faltaba.
-- Todo lo escribe Holman desde la Torre; el cliente solo lo lee (RLS de
-- hgg_programas sin cambios).

alter table hgg_programas
  -- Paso 1. El para qué, en una frase.
  add column if not exists sentido     text,
  -- Paso 1. Las metas pequeñas que llevan a la grande: [{ texto, fecha, hecha }].
  add column if not exists metas       jsonb not null default '[]'::jsonb,
  -- Paso 2. La tarjeta: la meta escrita en presente, para leerla mañana y noche.
  add column if not exists tarjeta     text,
  -- Paso 2. Las creencias que está cambiando: [{ antes, ahora }].
  add column if not exists creencias   jsonb not null default '[]'::jsonb,
  -- Paso 3. Lo que la meta le pide aprender: [{ nombre, nivel }] (nivel 1 a 10).
  add column if not exists habilidades jsonb not null default '[]'::jsonb;

comment on column hgg_programas.sentido is 'Paso 1 (Meta): el para qué, en una frase.';
comment on column hgg_programas.metas is 'Paso 1 (Meta): metas pequeñas [{texto, fecha, hecha}] hacia la meta a 90 días.';
comment on column hgg_programas.tarjeta is 'Paso 2 (Pensamientos): la meta en presente, para leer al despertar y antes de dormir.';
comment on column hgg_programas.creencias is 'Paso 2 (Pensamientos): [{antes, ahora}], la creencia que se suelta y la que se elige.';
comment on column hgg_programas.habilidades is 'Paso 3 (Habilidades): [{nombre, nivel}] con nivel de 1 a 10.';
