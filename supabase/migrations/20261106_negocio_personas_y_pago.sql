-- Negocio, fase 1 (28 oct 2026).
--
-- 1. «Tus personas»: una sola lista para el embajador con cada persona que
--    llegó por él y hasta dónde va: se registró a la masterclass → agendó su
--    Sesión de Claridad → entró al club → compró. Antes eran cuatro cifras y
--    dos listas que no cuadraban. Se junta por correo; el correo no sale.
--    El nombre completo y el WhatsApp solo salen de lo que la persona dejó por
--    su enlace (masterclass o agenda); de quien solo entró al club se ve el
--    nombre corto, como antes.
--
-- 2. Datos de pago: a dónde quiere recibir sus comisiones cada embajador. Lo
--    escribe él en «Mi negocio»; Holman lo ve en Comisiones → A quién le toca.
--
-- Se puede correr más de una vez.

create or replace function hgg_mis_personas()
returns json
language sql
security definer
set search_path = public
stable
as $$
  with
  mc as (
    select lower(g.email) as email, g.name as nombre, g.whatsapp,
           g.created_at as fecha, g.attended as asistio
    from ecos_guests g where g.invited_by = auth.uid()
  ),
  cl as (
    select distinct on (lower(c.email)) lower(c.email) as email, c.nombre, c.whatsapp,
           c.inicio as fecha, c.estado
    from hgg_citas c
    where c.referrer = auth.uid() and c.estado <> 'cancelada'
    order by lower(c.email), c.inicio desc
  ),
  club as (
    select lower(m.email) as email,
      coalesce(nullif(trim(split_part(trim(m.name), ' ', 1) ||
        case when position(' ' in trim(m.name)) > 0
             then ' ' || upper(left(split_part(trim(m.name), ' ', 2), 1)) || '.' else '' end), ''), 'Sin nombre') as nombre,
      case
        when m.status = 'activo' or m.teacher or m.cortesia then 'activo'
        when ecos_en_prueba(m.status, m.founder, m.prueba_hasta) then 'prueba'
        when m.status = 'pausado' then 'pausado'
        when m.status = 'cancelado' then 'cancelado'
        else 'sin_activar'
      end as estado,
      m.created_at as fecha
    from ecos_members m
    where m.referred_by = auth.uid() and m.id <> auth.uid()
  ),
  compra as (
    select lower(coalesce(c.buyer_email, c.buyer_id::text)) as email,
           max(c.buyer_name) as nombre, sum(c.base_amount) as total, max(c.created_at) as fecha
    from hgg_commissions c
    where c.referrer_id = auth.uid() and c.status <> 'anulada'
    group by 1
  ),
  todos as (
    select email from mc union select email from cl union select email from club union select email from compra
  )
  select coalesce(json_agg(x order by x.ultima desc), '[]'::json)
  from (
    select
      coalesce(mc.nombre, cl.nombre, club.nombre, compra.nombre, 'Sin nombre') as nombre,
      coalesce(mc.whatsapp, cl.whatsapp) as whatsapp,
      case when mc.email is null then null
           else json_build_object('fecha', mc.fecha, 'asistio', mc.asistio) end as masterclass,
      case when cl.email is null then null
           else json_build_object('fecha', cl.fecha, 'estado', cl.estado) end as claridad,
      case when club.email is null then null
           else json_build_object('fecha', club.fecha, 'estado', club.estado) end as club,
      case when compra.email is null then null
           else json_build_object('fecha', compra.fecha, 'total', compra.total) end as compra,
      greatest(mc.fecha, cl.fecha, club.fecha, compra.fecha) as ultima
    from todos t
    left join mc on mc.email = t.email
    left join cl on cl.email = t.email
    left join club on club.email = t.email
    left join compra on compra.email = t.email
  ) x;
$$;

revoke all on function hgg_mis_personas() from public, anon;
grant execute on function hgg_mis_personas() to authenticated;

-- 2. Datos de pago -------------------------------------------------------
create table if not exists hgg_datos_pago (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  metodo     text not null check (metodo in ('zelle', 'paypal', 'banco', 'otro')),
  detalle    text not null check (length(detalle) between 3 and 500),
  updated_at timestamptz not null default now()
);

alter table hgg_datos_pago enable row level security;

drop policy if exists "datos_pago_propios" on hgg_datos_pago;
create policy "datos_pago_propios" on hgg_datos_pago
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "datos_pago_admin_lee" on hgg_datos_pago;
create policy "datos_pago_admin_lee" on hgg_datos_pago
  for select using (is_admin());
