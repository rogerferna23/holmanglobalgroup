-- Permisos de las funciones: quien puede llamar cada una desde afuera.
--
-- Supabase le da permiso de ejecutar a `anon` (visitante sin sesion) y a
-- `authenticated` (cualquier cuenta) en toda funcion nueva del esquema public.
-- «revoke ... from public» NO se lo quita: hay que nombrarlos.
--
-- Lo grave: hgg_award_commission se podia llamar desde afuera. Con el enlace
-- de un embajador (?ref=ECOS1 → su id) cualquiera podia inventarle comisiones.
-- Se puede correr mas de una vez.

-- 1. Solo el servidor (los webhooks entran con service_role) -------------
revoke execute on function hgg_award_commission(uuid, text, text, uuid, text, text, text, numeric, numeric)
  from public, anon, authenticated;
grant execute on function hgg_award_commission(uuid, text, text, uuid, text, text, text, numeric, numeric)
  to service_role;

revoke execute on function ecos_apply_grace(uuid) from public, anon, authenticated;
grant execute on function ecos_apply_grace(uuid) to service_role;

revoke execute on function ecos_refresh_badges(uuid) from public, anon, authenticated;
grant execute on function ecos_refresh_badges(uuid) to service_role;

-- 2. Solo con sesion ------------------------------------------------------
revoke execute on function hgg_nuevo_codigo() from anon;
revoke execute on function ecos_unirse_prueba(text) from anon;

-- 3. Un visitante no tiene por que consultar el estado de alguien por su id
revoke execute on function hgg_referrer_kind(uuid) from public, anon;
revoke execute on function ecos_months_active(uuid) from public, anon;
revoke execute on function ecos_streak_weeks(uuid) from public, anon;

-- Para revisar: quien puede ejecutar cada una (deberia decir false en anon).
select p.proname as funcion,
       has_function_privilege('anon', p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as con_sesion
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('hgg_award_commission', 'ecos_apply_grace', 'ecos_refresh_badges',
                    'hgg_nuevo_codigo', 'ecos_unirse_prueba', 'hgg_referrer_kind',
                    'ecos_months_active', 'ecos_streak_weeks')
order by 1;
