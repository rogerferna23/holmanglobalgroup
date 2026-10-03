-- Las personas que trajo cada embajador, con su estado en el club.
--
-- Hasta ahora el embajador solo veia a alguien cuando compraba (en sus
-- movimientos). Quien se registro por su enlace y sigue en el mes gratis no
-- aparecia en ningun lado, y es justo a quien conviene acompanar para que se
-- quede. Aqui sale la lista completa.
--
-- Solo nombre de pila + inicial del apellido y el estado: ni correo ni
-- WhatsApp. El contacto lo tiene el embajador por su lado, si lo invito el.
--
-- Se puede correr mas de una vez.

create or replace function ecos_mis_referidos()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(x order by x.desde desc), '[]'::json)
  from (
    select
      -- «Laura Gómez Ruiz» -> «Laura G.»
      coalesce(
        nullif(trim(
          split_part(trim(m.name), ' ', 1) ||
          case when position(' ' in trim(m.name)) > 0
               then ' ' || upper(left(split_part(trim(m.name), ' ', 2), 1)) || '.'
               else '' end
        ), ''),
        'Sin nombre'
      ) as nombre,
      case
        when m.status = 'activo' or m.teacher or m.cortesia then 'activo'
        when m.status = 'pendiente' and m.founder and now() < ecos_trial_end() then 'prueba'
        when m.status = 'pausado' then 'pausado'
        when m.status = 'cancelado' then 'cancelado'
        else 'sin_activar'
      end as estado,
      m.created_at as desde
    from ecos_members m
    where m.referred_by = auth.uid()
      and m.id <> auth.uid()
  ) x;
$$;

revoke all on function ecos_mis_referidos() from public, anon;
grant execute on function ecos_mis_referidos() to authenticated;
