-- Material de estudio de los profesores y reconocimientos (diplomas).
-- Idea de Zack. Se puede correr mas de una vez.

-- =====================================================================
-- 1. Material de estudio
-- =====================================================================
-- El profesor sube un archivo (va a Storage, carpeta con su id) o pega un
-- enlace. Lo ve todo el que tiene acceso al club. Es opcional.
create table if not exists ecos_material (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  teacher_name text,
  subject      text not null check (subject in ('ventas', 'marketing', 'oratoria', 'abierta')),
  title        text not null check (length(trim(title)) between 2 and 140),
  description  text check (description is null or length(description) <= 600),
  -- Archivo en el bucket ecos-material (ruta «<teacher_id>/<archivo>»)...
  file_path    text,
  file_name    text,
  -- ...o un enlace. Solo http(s): nada de «javascript:».
  url          text check (url is null or url ~* '^https?://'),
  created_at   timestamptz not null default now(),
  check (file_path is not null or url is not null)
);
create index if not exists ecos_material_created_idx on ecos_material (created_at desc);
alter table ecos_material enable row level security;

drop policy if exists "material_leer" on ecos_material;
create policy "material_leer" on ecos_material
  for select using (is_ecos_member() or is_admin() or teacher_id = auth.uid());

-- Solo un profesor sube, y solo a su nombre. Su archivo tiene que estar en su
-- propia carpeta del bucket.
drop policy if exists "material_subir" on ecos_material;
create policy "material_subir" on ecos_material
  for insert with check (
    is_ecos_teacher() and teacher_id = auth.uid()
    and (file_path is null or split_part(file_path, '/', 1) = auth.uid()::text)
  );

drop policy if exists "material_borrar" on ecos_material;
create policy "material_borrar" on ecos_material
  for delete using (teacher_id = auth.uid() or is_admin());

-- =====================================================================
-- 2. Donde viven los archivos
-- =====================================================================
-- Privado: se abre con un enlace firmado que dura una hora. 25 MB por archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ecos-material', 'ecos-material', false, 26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/png', 'image/jpeg', 'image/webp',
    'audio/mpeg', 'audio/mp4', 'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ecos_material_leer" on storage.objects;
create policy "ecos_material_leer" on storage.objects
  for select using (bucket_id = 'ecos-material' and (is_ecos_member() or is_admin()));

drop policy if exists "ecos_material_subir" on storage.objects;
create policy "ecos_material_subir" on storage.objects
  for insert with check (
    bucket_id = 'ecos-material' and is_ecos_teacher()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "ecos_material_borrar" on storage.objects;
create policy "ecos_material_borrar" on storage.objects
  for delete using (
    bucket_id = 'ecos-material'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

-- =====================================================================
-- 3. Reconocimientos: cuantos meses lleva en el club
-- =====================================================================
-- Meses PAGADOS: cada factura mensual cuenta 1 y la anual 12. Profesores y
-- cortesias no pagan: para ellos cuentan los meses desde que entraron.
-- Devuelve tambien la fecha en que cumplio 2 meses (la que va en el diploma).
create or replace function ecos_mis_reconocimientos()
returns json
language sql
security definer
set search_path = public
stable
as $$
  with yo as (
    select id, teacher, cortesia, created_at from ecos_members where id = auth.uid()
  ),
  pagos as (
    select paid_at,
           sum(case when plan = 'anual' then 12 else 1 end) over (order by paid_at) as acumulado
    from ecos_payments
    where member_id = auth.uid() and amount_usd > 0
  ),
  gratis as (
    select floor(extract(epoch from (now() - created_at)) / 2592000)::int as meses, created_at
    from yo where teacher or cortesia
  )
  select json_build_object(
    'meses', coalesce((select meses from gratis), (select max(acumulado) from pagos), 0),
    'dos_meses', coalesce(
      (select created_at + interval '2 months' from gratis where meses >= 2),
      (select min(paid_at) from pagos where acumulado >= 2)
    )
  );
$$;

revoke execute on function ecos_mis_reconocimientos() from public, anon;
grant execute on function ecos_mis_reconocimientos() to authenticated;

-- Para revisar
select to_regclass('public.ecos_material') as tabla,
       (select public from storage.buckets where id = 'ecos-material') as bucket_publico;
