-- ============================================
-- MIGRACION: reseñas de clientes (alta manual desde el panel privado)
-- Brief "Badges y descripciones" (ago 2026).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente: se puede volver a
-- ejecutar sin miedo aunque ya se hubiera corrido la version anterior.
-- ============================================
--
-- Flujo actual:
--   1) Holman entra a /admin/resenas (detras del login) y sube las reseñas una
--      por una: nombre, cargo · pais, estrellas, texto y foto.
--   2) La reseña se publica en el momento; el orden en la web es el orden de
--      subida (created_at ascendente).
--   3) anon SOLO puede leer las publicadas. Ya NO puede insertar: el formulario
--      publico /tu-experiencia se elimino junto con su cola de aprobacion.
--
-- Estado (`status`): se mantiene la columna, pero en la aplicacion solo se usan
--   'aprobado'  -> publicada (visible en la web)
--   'pendiente' -> oculta (guardada, pero fuera de la web)

-- OJO CON EL PROYECTO: esto va en el Supabase de la LANDING (el que tiene
-- `profiles`, `products` y las funciones is_staff()/is_admin()), NO en el del
-- CRM/DelegaWork. Ahi is_staff() no existe y el script se caia A MITAD —
-- despues de haber creado la tabla— dejando una `reviews` huerfana en la base
-- equivocada. Mejor parar antes de tocar nada.
do $$ begin
  if to_regproc('public.is_staff') is null or to_regproc('public.is_admin') is null then
    raise exception 'Proyecto equivocado: aqui no estan is_staff()/is_admin(). Esta migracion va en el Supabase de la landing de HGG.';
  end if;
end $$;

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

-- Lectura publica: SOLO las publicadas (es lo que consume el sitio).
drop policy if exists "reviews_public_read_approved" on reviews;
create policy "reviews_public_read_approved" on reviews
  for select to anon using (status = 'aprobado');

-- El panel las ve todas (staff) y solo admin escribe.
drop policy if exists "reviews_staff_read" on reviews;
create policy "reviews_staff_read" on reviews
  for select using (is_staff());

drop policy if exists "reviews_admin_insert" on reviews;
create policy "reviews_admin_insert" on reviews
  for insert with check (is_admin());

drop policy if exists "reviews_admin_update" on reviews;
create policy "reviews_admin_update" on reviews
  for update using (is_admin()) with check (is_admin());

drop policy if exists "reviews_admin_delete" on reviews;
create policy "reviews_admin_delete" on reviews
  for delete using (is_admin());

-- Se retira el alta anonima del formulario publico (ya no existe esa pagina).
drop policy if exists "reviews_public_insert_pending" on reviews;

-- updated_at automatico (set_updated_at() ya existe desde 20260519).
drop trigger if exists reviews_set_updated_at on reviews;
create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();

-- =====================================================================
-- STORAGE: bucket publico `resenas` para las fotos de cada reseña
-- =====================================================================
-- Publico en lectura (la foto se muestra en el sitio) y con subida y borrado
-- reservados al admin, limitado a 5 MB e imagenes.

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

drop policy if exists "resenas_admin_upload" on storage.objects;
create policy "resenas_admin_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'resenas' and is_admin());

drop policy if exists "resenas_admin_delete" on storage.objects;
create policy "resenas_admin_delete" on storage.objects
  for delete using (bucket_id = 'resenas' and is_admin());

-- Se retira la subida anonima (era del formulario publico).
drop policy if exists "resenas_anon_upload" on storage.objects;
