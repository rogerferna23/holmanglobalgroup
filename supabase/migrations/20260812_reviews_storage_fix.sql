-- ============================================
-- ARREGLO: subir fotos de reseñas desde /admin/resenas
-- ============================================
-- Sintoma: el panel publica la reseña pero al adjuntar foto sale
--   "No se pudo subir la foto".
-- Causa: el bucket `resenas` existe y es publico (la lectura funciona), pero
--   las policies de ESCRITURA sobre storage.objects no llegaron a crearse — o
--   el usuario con el que entras al panel no tiene rol admin en `profiles`.
--   El bucket se puede crear desde el Dashboard sin que eso cree ni una sola
--   policy, asi que "el bucket ya esta" no significa que se pueda subir nada.
--
-- Es idempotente: se puede ejecutar las veces que haga falta.
-- Ejecutar en el SQL Editor del Supabase de la LANDING (el que tiene
-- `profiles` e `is_admin()`), NO en el del CRM/DelegaWork.
--
-- SI ESTE SCRIPT FALLA con "42501: must be owner of table objects": tu rol del
-- SQL Editor no puede tocar las policies de Storage. En ese caso hazlo por el
-- Dashboard: Storage -> resenas -> Policies -> New policy -> For full
-- customization, y crea las mismas tres de abajo (SELECT publica, INSERT y
-- DELETE para authenticated con `is_admin()`).

-- Paramos si estamos en el proyecto equivocado, antes de tocar nada.
do $$ begin
  if to_regproc('public.is_admin') is null then
    raise exception 'Proyecto equivocado: aqui no esta is_admin(). Esto va en el Supabase de la landing de HGG.';
  end if;
end $$;

-- =====================================================================
-- 1. Bucket: publico en lectura, 5 MB, solo imagenes
-- =====================================================================
-- Si ya existe (creado a mano por el Dashboard), le re-aplicamos los limites
-- que espera el formulario, para que lo que valida el panel y lo que acepta
-- Supabase sean exactamente lo mismo.
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

-- =====================================================================
-- 2. Policies de storage.objects (esto es lo que faltaba)
-- =====================================================================
-- Lectura: cualquiera (la foto se ve en el carrusel del landing).
drop policy if exists "resenas_public_read" on storage.objects;
create policy "resenas_public_read" on storage.objects
  for select using (bucket_id = 'resenas');

-- Subida: solo admin autenticado desde el panel.
drop policy if exists "resenas_admin_upload" on storage.objects;
create policy "resenas_admin_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resenas' and public.is_admin());

-- Update: supabase-js reintenta como update cuando el objeto ya existe.
drop policy if exists "resenas_admin_update" on storage.objects;
create policy "resenas_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'resenas' and public.is_admin())
  with check (bucket_id = 'resenas' and public.is_admin());

-- Borrado: la foto se va con la reseña.
drop policy if exists "resenas_admin_delete" on storage.objects;
create policy "resenas_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resenas' and public.is_admin());

-- Restos del formulario publico, que ya no existe.
drop policy if exists "resenas_anon_upload" on storage.objects;

-- =====================================================================
-- 3. VERIFICACION — lee estas cuatro filas antes de volver al panel
-- =====================================================================
-- - bucket        -> tiene que decir OK
-- - policies      -> tienen que salir las cuatro resenas_*
-- - admins        -> el email con el que entras al panel tiene que estar aqui.
--                    Si no sale, ese es el fallo: is_admin() da false y Storage
--                    rechaza la subida. Para darle rol (sirve tanto si tiene
--                    profile con rol 'vendor' como si no tiene fila ninguna):
--
--                      insert into profiles (id, email, name, role)
--                      select u.id, u.email,
--                             coalesce(u.raw_user_meta_data->>'name', u.email),
--                             'admin'
--                        from auth.users u
--                       where u.id = 'PEGA-AQUI-EL-UUID'
--                      on conflict (id) do update set role = 'admin';
--
--                    (con el email en vez del uuid: where u.email = 'tu@email.com')
--                    Despues, cerrar sesion y volver a entrar al panel: el rol
--                    se lee en cada peticion, pero conviene refrescar el token.
-- - tabla reviews -> la tabla de las reseñas tiene que existir
select 'bucket' as chequeo,
       coalesce(
         (select case when public then 'OK · publico, ' || coalesce(file_size_limit, 0) / 1048576 || ' MB'
                      else 'MAL · el bucket no es publico' end
            from storage.buckets where id = 'resenas'),
         'MAL · no existe el bucket resenas'
       ) as resultado
union all
select 'policies',
       coalesce(
         nullif(string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname), ''),
         'MAL · storage.objects no tiene ninguna policy resenas_*'
       )
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects' and policyname like 'resenas\_%'
union all
select 'admins',
       coalesce(
         nullif(string_agg(email || ' → ' || role, ', ' order by email), ''),
         'MAL · no hay ningun usuario con rol admin/super'
       )
  from profiles where role in ('super', 'admin')
union all
-- (a proposito sin `select count(*) from reviews`: si la tabla no existiera, el
--  parser tumbaria toda la verificacion antes de ejecutarla)
select 'tabla reviews',
       case when to_regclass('public.reviews') is null
            then 'MAL · falta la tabla (aplica antes 20260810_reviews.sql)'
            else 'OK · la tabla existe' end;
