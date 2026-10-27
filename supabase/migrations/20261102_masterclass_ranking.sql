-- Ranking de invitados a la próxima masterclass (27 oct 2026).
--
-- Los Fundadores Elite ven en «Mi negocio» cómo van todos: cuántas personas
-- registró cada uno con su enlace (/masterclass?by=CODIGO) para la próxima
-- masterclass. Premio para quien lleve más. Salen los fundadores (aunque
-- lleven 0, para que se vea el equipo completo) y cualquier miembro que haya
-- registrado a alguien. Solo nombre e inicial del último apellido.
--
-- Lo puede consultar cualquier miembro con sesión; no muestra correos ni
-- datos de los invitados.
--
-- Se puede correr más de una vez.

create or replace function hgg_ranking_masterclass()
returns json
language sql
security definer
set search_path = public
stable
as $$
  -- Igual que hgg_mis_invitados_masterclass: los registros de las masterclass
  -- que vienen (o de hoy), para que el número del panel y el ranking coincidan.
  with conteo as (
    select g.invited_by as quien, count(*)::int as n
    from ecos_guests g join ecos_sessions s on s.id = g.session_id
    where g.invited_by is not null and s.starts_at > now() - interval '1 day'
    group by 1
  ),
  gente as (
    select p.user_id as quien from hgg_programas p
    where p.producto = 'fundador' and p.user_id is not null and p.nombre not like '%(muestra)%'
    union
    select quien from conteo
  )
  select coalesce(json_agg(x order by x.registrados desc, x.nombre), '[]'::json)
  from (
    select
      initcap(split_part(trim(n.nombre), ' ', 1))
        -- La inicial del último apellido: «José de Jesús Sandoval» → «José S.».
        || case when position(' ' in trim(n.nombre)) > 0
             then ' ' || upper(left(substring(trim(n.nombre) from '([^ ]+)$'), 1)) || '.' else '' end as nombre,
      coalesce(c.n, 0) as registrados,
      (g.quien = auth.uid()) as yo
    from gente g
    left join conteo c on c.quien = g.quien
    cross join lateral (
      select coalesce(
        (select p.nombre from hgg_programas p where p.user_id = g.quien and p.producto = 'fundador' limit 1),
        (select m.name from ecos_members m where m.id = g.quien),
        'Miembro') as nombre
    ) n
  ) x;
$$;

revoke all on function hgg_ranking_masterclass() from public, anon;
grant execute on function hgg_ranking_masterclass() to authenticated;

-- Para revisar
select hgg_ranking_masterclass();
