-- Limpiar las fichas de prueba de ECOS.
-- Supabase → SQL Editor. Correr por partes, mirando antes de borrar.

-- 1) VER qué hay. No borra nada.
select id, email, status, founder, plan, stripe_subscription_id, created_at
from ecos_members
order by created_at;

-- 2) BORRAR solo las que nunca pagaron.
--    Se excluye a propósito cualquiera con suscripción en Stripe: borrar esa
--    ficha dejaría la suscripción cobrando sin nadie a quien darle acceso.
delete from ecos_members
where status in ('pendiente', 'cancelado')
  and stripe_subscription_id is null;

-- 3) Comprobar el contador.
select ecos_founder_spots();


-- ---------------------------------------------------------------------------
-- Si además quieres soltar la cuenta de prueba que SÍ pagó:
--
--   a) Primero cancela su suscripción en Stripe (Subscriptions → Cancel).
--      El webhook la marcará 'cancelado' solo, en segundos.
--   b) Después vuelve a correr el paso 2.
--
-- En ese orden. Al revés queda una suscripción viva sin ficha, y el webhook
-- no encontraría a quién aplicarle los cobros.
-- ---------------------------------------------------------------------------
