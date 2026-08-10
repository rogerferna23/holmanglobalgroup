-- ============================================
-- MIGRACION: reseñas de clientes (formulario privado)
-- Brief "Ajustes Adicionales" (ago 2026), punto 5.
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- ============================================
--
-- Flujo:
--   1) El cliente abre el link privado /tu-experiencia (no indexado, no
--      enlazado desde el sitio) y envía estrellas + nombre + reseña + foto.
--   2) La fila entra SIEMPRE como 'pendiente' — el visitante no puede elegir
--      otro estado (lo fuerza la policy de insert).
--   3) Holman aprueba o rechaza en /admin/resenas.
--   4) Solo las aprobadas son legibles por anon, así que solo esas aparecen
--      en el carrusel del landing y en /experiencias.
--
-- El `role` (cargo · país) no está en el formulario: lo rellena Holman al
-- aprobar, para que la tarjeta quede igual que las experiencias curadas.

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 2 and 80),
  role        text check (role is null or char_length(role) <= 120),
  rating      int  not null check (rating between 1 and 5),
  quote       text not null check (char_length(trim(quote)) between 10 and 1200),
  photo_path  text check (photo_path is null or char_length(photo_path) <= 300),
  status      text not null default 'pendiente'
                check (status in ('pendiente', 'aprobado', 'rechazado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reviews_status_idx     on reviews (status);
create index if not exists reviews_created_at_idx on reviews (created_at desc);

alter table reviews enable row level security;

-- Lectura publica: SOLO las aprobadas (es lo que consume el sitio).
drop policy if exists "reviews_public_read_approved" on reviews;
create policy "reviews_public_read_approved" on reviews
  for select to anon using (status = 'aprobado');

-- El formulario privado inserta como anon, siempre en 'pendiente'.
drop policy if exists "reviews_public_insert_pending" on reviews;
create policy "reviews_public_insert_pending" on reviews
  for insert to anon with check (status = 'pendiente' and role is null);

-- El panel admin ve todas y decide.
drop policy if exists "reviews_staff_read" on reviews;
create policy "reviews_staff_read" on reviews
  for select using (is_staff());

drop policy if exists "reviews_admin_update" on reviews;
create policy "reviews_admin_update" on reviews
  for update using (is_admin()) with check (is_admin());

drop policy if exists "reviews_admin_delete" on reviews;
create policy "reviews_admin_delete" on reviews
  for delete using (is_admin());

-- updated_at automatico (set_updated_at() ya existe desde 20260519).
drop trigger if exists reviews_set_updated_at on reviews;
create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();

-- =====================================================================
-- STORAGE: bucket publico `resenas` para las fotos que sube el cliente
-- =====================================================================
-- Publico en lectura (la foto se muestra en el sitio) y con subida permitida
-- a anon, limitada a 5 MB e imagenes. Sin listado ni borrado para anon.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resenas',
  'resenas',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "resenas_public_read" on storage.objects;
create policy "resenas_public_read" on storage.objects
  for select using (bucket_id = 'resenas');

drop policy if exists "resenas_anon_upload" on storage.objects;
create policy "resenas_anon_upload" on storage.objects
  for insert to anon with check (bucket_id = 'resenas');

drop policy if exists "resenas_admin_delete" on storage.objects;
create policy "resenas_admin_delete" on storage.objects
  for delete using (bucket_id = 'resenas' and is_admin());
