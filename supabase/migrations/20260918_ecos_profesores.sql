-- =====================================================================
-- ECOS · Profesores
-- =====================================================================
-- Quien da una materia entra al club sin pagar, y puede preparar sus propias
-- clases sin tocar el panel de administracion.
--
-- Se resuelve con una marca en la ficha, no con una plataforma aparte: son tres
-- personas, y todo lo que necesitan ya existe. Lo unico que cambia es quien
-- puede ver que.
-- =====================================================================

-- 1. La marca -----------------------------------------------------------
alter table ecos_members add column if not exists teacher boolean not null default false;

comment on column ecos_members.teacher is
  'Da una materia. Entra sin pagar y edita sus propias sesiones. El status se '
  'queda en pendiente a proposito: asi no cuenta como miembro de pago en los '
  'reportes ni ocupa cupo de fundador.';

-- 2. Entrar sin pagar ---------------------------------------------------
-- is_ecos_member() es la puerta de todo lo que ve un miembro. Al incluir aqui
-- a los profesores, heredan el acceso completo sin duplicar una sola politica.
create or replace function is_ecos_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from ecos_members
    where id = auth.uid() and (status = 'activo' or teacher)
  );
$$;

create or replace function is_ecos_teacher()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from ecos_members where id = auth.uid() and teacher
  );
$$;

revoke all on function is_ecos_teacher() from public;
grant execute on function is_ecos_teacher() to authenticated;

-- 3. De quien es cada clase ---------------------------------------------
-- Habia un `teacher` de texto (el nombre, para mostrar). Esto es distinto: es
-- a quien le pertenece la sesion, para saber cual puede editar.
alter table ecos_sessions add column if not exists teacher_id uuid
  references auth.users(id) on delete set null;

create index if not exists ecos_sessions_teacher_idx on ecos_sessions (teacher_id);

-- 4. Permisos sobre las sesiones ----------------------------------------
-- El profesor ve las suyas aunque no esten publicadas: son su borrador.
drop policy if exists "ecos_sessions_teacher_read" on ecos_sessions;
create policy "ecos_sessions_teacher_read" on ecos_sessions
  for select using (teacher_id = auth.uid());

-- Y las edita. No puede cambiar de dueno ni publicar lo de otro: la condicion
-- se exige antes y despues del cambio.
drop policy if exists "ecos_sessions_teacher_update" on ecos_sessions;
create policy "ecos_sessions_teacher_update" on ecos_sessions
  for update using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- Crear y borrar sesiones sigue siendo del administrador: el calendario del
-- club es uno solo y no se arma desde tres lados.
