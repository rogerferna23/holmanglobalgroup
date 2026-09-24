-- =====================================================================
-- ECOS · Membresias de cortesia
-- =====================================================================
-- Personas que Holman invita al club sin cobrarles. Entran igual que un
-- miembro de pago, pero no pagan: no cuentan en los ingresos ni ocupan cupo
-- de fundador.
--
-- Si ya tenian una suscripcion en Stripe, la funcion ecos-cortesia la cancela
-- al marcarlas, para que nunca les llegue un cobro.
-- =====================================================================

alter table ecos_members add column if not exists cortesia boolean not null default false;

comment on column ecos_members.cortesia is
  'Entra al club sin pagar, por decision de Holman. El status puede quedar en '
  'cancelado (se le cancelo la suscripcion para no cobrarle): el acceso lo da '
  'esta marca, no el status.';

-- La puerta de todo lo que ve un miembro: pago activo, profesor o cortesia.
create or replace function is_ecos_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from ecos_members
    where id = auth.uid() and (status = 'activo' or teacher or cortesia)
  );
$$;

-- Cuentas registradas que todavia no tienen ficha en el club: quien entro por
-- el enlace de profesor, quien se registro y no pago. Solo para el admin.
create or replace function ecos_cuentas_sin_membresia()
returns table (id uuid, email text, name text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.email, p.name, p.created_at
  from profiles p
  where is_admin()
    and p.role not in ('super', 'admin', 'vendor')
    and not exists (select 1 from ecos_members m where m.id = p.id)
  order by p.created_at desc
  limit 100;
$$;

revoke all on function ecos_cuentas_sin_membresia() from public;
grant execute on function ecos_cuentas_sin_membresia() to authenticated;
