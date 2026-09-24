-- =====================================================================
-- ECOS · Los profesores tambien son embajadores
-- =====================================================================
-- Quien da clase tiene los mismos beneficios que quien paga y que las
-- cortesias: 10% de comision por sus referidos (y el 10% de descuento, que se
-- aplica en create-payment-intent). Desde aqui, todo el que esta dentro del
-- club tiene los mismos beneficios; lo unico que cambia es si suma ingresos.
-- =====================================================================

create or replace function hgg_referrer_kind(p_user uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when exists (select 1 from ecos_members
                 where id = p_user and (status = 'activo' or cortesia or teacher))
      then 'embajador'
    when exists (select 1 from hgg_referrers where id = p_user and approved)
      then 'afiliado'
    else null
  end;
$$;
