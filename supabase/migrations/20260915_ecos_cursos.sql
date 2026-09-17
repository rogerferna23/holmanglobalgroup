-- ============================================
-- MIGRACION: ECOS — cursos con precio y acceso manual; referidos sin mes gratis
-- Ejecutar DESPUES de 20260915_ecos_rpg.sql
-- ============================================
--
-- Holman decidio (15 sep 2026):
--  - La biblioteca pasa a llamarse "Cursos". Cada curso tiene precio. NO se
--    desbloquea por permanencia: el acceso lo da Holman a mano (o cuando la
--    persona lo compra). Las grabaciones siguen siendo de todos los miembros.
--  - Referidos: se elimina el "mes gratis". El beneficio es 10% de comision
--    si el referido compra un producto de HGG, y todo miembro tiene 10% de
--    descuento en los productos de HGG.

alter table ecos_library add column if not exists price_usd numeric(10, 2);

create table if not exists ecos_course_access (
  member_id  uuid not null references auth.users(id) on delete cascade,
  library_id text not null references ecos_library(id) on delete cascade,
  granted_by text not null default 'admin' check (granted_by in ('admin', 'compra')),
  note       text,
  created_at timestamptz not null default now(),
  primary key (member_id, library_id)
);
alter table ecos_course_access enable row level security;
drop policy if exists "access_self_read" on ecos_course_access;
create policy "access_self_read" on ecos_course_access for select using (auth.uid() = member_id);
drop policy if exists "access_admin_all" on ecos_course_access;
create policy "access_admin_all" on ecos_course_access for all using (is_admin()) with check (is_admin());

-- Un curso es accesible si es gratis (sin precio) o si el miembro tiene acceso.
-- Una leccion hereda el acceso de su curso. Grabaciones y recursos: todos.
create or replace function ecos_can_open(p_library text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with it as (select * from ecos_library where id = p_library),
  course as (select coalesce((select parent_id from it), p_library) as id)
  select case
    when (select kind from it) <> 'curso' then true
    when coalesce((select price_usd from ecos_library where id = (select id from course)), 0) = 0 then true
    else exists (select 1 from ecos_course_access a where a.member_id = auth.uid() and a.library_id = (select id from course))
  end;
$$;

drop policy if exists "ecos_library_member_read" on ecos_library;
create policy "ecos_library_member_read" on ecos_library
  for select using (published and is_ecos_member() and ecos_can_open(id));

-- El catalogo completo (con precio) para pintar lo que no se tiene.
-- Postgres no deja cambiar las columnas que devuelve una funcion con
-- CREATE OR REPLACE: hay que borrarla primero. Por eso el drop.
drop function if exists ecos_library_catalog();
create or replace function ecos_library_catalog()
returns table (
  id text, title text, description text, kind text, cover_url text,
  unlock_month integer, sort_order integer, parent_id text, skill text, price_usd numeric, has_access boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select id, title, description, kind, cover_url, unlock_month, sort_order, parent_id, skill, price_usd, ecos_can_open(id)
  from ecos_library
  where published and is_ecos_member()
  order by sort_order, title;
$$;

insert into ecos_settings (key, value) values ('network_url', '') on conflict (key) do nothing;
