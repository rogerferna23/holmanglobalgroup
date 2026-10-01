-- Material de promoción para los embajadores (Negocio → Material): flyers,
-- videos y otras piezas para publicar en redes. Las sube Holman desde el admin
-- (ECOS → Promoción); las ven y descargan los miembros con acceso.
-- Se puede correr mas de una vez.

create table if not exists ecos_promo (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null check (tipo in ('flyer', 'video', 'otro')),
  titulo     text not null check (length(trim(titulo)) between 2 and 140),
  -- Texto sugerido para publicar. «{enlace}» se reemplaza por el enlace de cada
  -- embajador; si no está, el enlace se agrega al final.
  texto      text check (texto is null or length(texto) <= 1500),
  file_path  text,
  file_name  text,
  url        text check (url is null or url ~* '^https?://'),
  orden      int not null default 0,
  created_at timestamptz not null default now(),
  check (file_path is not null or url is not null)
);
create index if not exists ecos_promo_orden_idx on ecos_promo (tipo, orden, created_at desc);
alter table ecos_promo enable row level security;

drop policy if exists "promo_leer" on ecos_promo;
create policy "promo_leer" on ecos_promo
  for select using (is_ecos_member() or is_admin());

drop policy if exists "promo_admin" on ecos_promo;
create policy "promo_admin" on ecos_promo
  for all using (is_admin()) with check (is_admin());

-- Público: son piezas para publicar, y así se descargan y comparten sin
-- enlaces que caduquen. Subir y borrar, solo el admin. 50 MB por archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ecos-promo', 'ecos-promo', true, 52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ecos_promo_subir" on storage.objects;
create policy "ecos_promo_subir" on storage.objects
  for insert with check (bucket_id = 'ecos-promo' and is_admin());

drop policy if exists "ecos_promo_borrar" on storage.objects;
create policy "ecos_promo_borrar" on storage.objects
  for delete using (bucket_id = 'ecos-promo' and is_admin());

-- Para revisar
select to_regclass('public.ecos_promo') as tabla,
       (select public from storage.buckets where id = 'ecos-promo') as bucket_publico;
