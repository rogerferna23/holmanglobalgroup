-- ============================================
-- MIGRACION: etapa (Sentido · Marca · Sistema) y orden manual en las reseñas
-- Brief "Experiencias por etapa" (ago 2026).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente: se puede volver a
-- ejecutar sin miedo aunque ya se hubiera corrido una version anterior.
-- ============================================
--
-- Que cambia:
--   1) Las reseñas dejan de ser una lista plana y pasan a pertenecer a una de
--      las tres etapas del camino. El landing pinta un carrusel por etapa y
--      /experiencias las agrupa en tres bloques.
--   2) El orden deja de depender de la fecha de alta: ahora hay una columna
--      `position` que se cambia con las flechas del panel, sin tener que
--      borrar y volver a subir una reseña para moverla de sitio.
--
-- Las reseñas que ya estaban subidas se pasan a `sentido`, que es la etapa a
-- la que pertenecen todas las que habia hasta ahora. Si alguna no fuera de esa
-- etapa se cambia en un segundo desde /admin/resenas — o se borra la sentencia
-- de mas abajo antes de ejecutar, y entonces quedan sin etapa: no se pierden,
-- salen en /experiencias bajo "Otras experiencias" hasta que se les asigne una.

-- OJO CON EL PROYECTO: esto va en el Supabase de la LANDING (el que tiene
-- `profiles`, `products` y las funciones is_staff()/is_admin()), NO en el del
-- CRM/DelegaWork. Igual que en 20260810_reviews.sql, paramos antes de tocar
-- nada si estamos en la base equivocada.
do $$ begin
  if to_regproc('public.is_staff') is null or to_regproc('public.is_admin') is null then
    raise exception 'Proyecto equivocado: aqui no estan is_staff()/is_admin(). Esta migracion va en el Supabase de la landing de HGG.';
  end if;
end $$;

-- Y si la tabla de reseñas todavia no existe, la migracion anterior no se ha
-- aplicado. Mejor decirlo claro que fallar con un "relation does not exist".
do $$ begin
  if to_regclass('public.reviews') is null then
    raise exception 'Falta la tabla `reviews`: aplica antes 20260810_reviews.sql.';
  end if;
end $$;

alter table reviews add column if not exists stage text;

-- Valores permitidos. NULL = sin clasificar (reseñas anteriores a esta migracion).
alter table reviews drop constraint if exists reviews_stage_check;
alter table reviews add constraint reviews_stage_check
  check (stage is null or stage in ('sentido', 'marca', 'sistema'));

-- El sitio filtra por etapa + estado.
create index if not exists reviews_stage_idx on reviews (stage);

-- Todas las reseñas que ya estaban subidas son de Sentido. Solo toca las que
-- no tienen etapa, asi que volver a ejecutar la migracion no pisa nada de lo
-- que se haya reclasificado despues a mano.
update reviews set stage = 'sentido' where stage is null;

-- =====================================================================
-- ORDEN MANUAL
-- =====================================================================
-- `position` decide en que orden se ven las reseñas dentro de su etapa. Se
-- numera de 10 en 10 para dejar hueco entre medias, y las flechas del panel
-- intercambian el valor de dos vecinas.
alter table reviews add column if not exists position int;

-- Numeracion inicial: se respeta el orden que tenian hasta ahora (fecha de
-- alta). Solo se rellenan las que estan a NULL, para no repartir de nuevo el
-- orden que ya haya colocado Holman a mano.
with ordenadas as (
  select id, (row_number() over (order by created_at asc)) * 10 as n
  from reviews
  where position is null
)
update reviews r
   set position = o.n + coalesce((select max(position) from reviews), 0)
  from ordenadas o
 where r.id = o.id;

create index if not exists reviews_position_idx on reviews (position);

-- =====================================================================
-- VERIFICACION — cuantas reseñas hay en cada etapa.
-- Si sale alguna fila con etapa `— sin etapa —`, es que se borro la sentencia
-- de asignacion a Sentido: se clasifican desde /admin/resenas.
-- =====================================================================
select
  coalesce(stage, '— sin etapa —') as etapa,
  count(*)                        as total,
  count(*) filter (where status = 'aprobado') as publicadas
from reviews
group by 1
order by 1;
