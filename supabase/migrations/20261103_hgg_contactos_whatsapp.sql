-- Contactos: toda la agenda de WhatsApp en el CRM de Torre → Clientes (oct 2026).
--
-- Holman importa los contactos del celular (vCard o CSV) y los ordena con
-- etiquetas libres. Lo importado entra en la etapa «En mi base»: está en la
-- lista pero todavía no en el embudo de venta.

alter table hgg_contactos add column if not exists etiquetas text[] not null default '{}';
-- 'manual' = escrito en la Torre; 'agenda' = importado del celular.
alter table hgg_contactos add column if not exists origen text not null default 'manual';
alter table hgg_contactos drop constraint if exists hgg_contactos_origen_check;
alter table hgg_contactos add constraint hgg_contactos_origen_check check (origen in ('manual', 'agenda'));

alter table hgg_contactos drop constraint if exists hgg_contactos_etapa_check;
alter table hgg_contactos add constraint hgg_contactos_etapa_check
  check (etapa in ('base', 'por_contactar', 'contactado', 'conversando', 'claridad', 'cerrado', 'no_ahora'));

create index if not exists hgg_contactos_etiquetas_idx on hgg_contactos using gin (etiquetas);
