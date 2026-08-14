-- ============================================
-- DIAGNOSTICO: "no puedo entrar al panel" + "las reseñas desaparecieron"
-- Brief HGG 13-ago-2026, punto 6.
-- ============================================
--
-- NO modifica nada: solo lee. Pegalo entero en el SQL Editor del Supabase de la
-- LANDING y lee las filas que devuelve. Cada una responde a una hipotesis.
--
-- ANTES DE CORRERLO, la comprobacion de 30 segundos que descarta la causa mas
-- probable: abre el sitio en produccion, DevTools -> Network, filtra por
-- "supabase" y mira a que host llama. Si NO es el mismo proyecto en el que estas
-- ejecutando esto, el problema no esta en la base de datos: el build desplegado
-- apunta a otro sitio (variables VITE_SUPABASE_* del hosting) y por eso fallan
-- el login Y las reseñas a la vez. En ese caso, para aqui y arregla el deploy.
--
-- (El mismo dato se ve ya desde el panel: /admin/configuracion -> "Estado de la
--  conexion" muestra el proyecto, tu rol y cuantas reseñas ve el publico.)

-- =====================================================================
-- 0 · ¿Estoy en el proyecto correcto?
-- =====================================================================
select '0 · proyecto' as chequeo,
       case
         when to_regproc('public.is_admin') is null
           then 'MAL · aqui no esta is_admin(). Este es el Supabase del CRM/DelegaWork, no el de la landing.'
         else 'OK · es el Supabase de la landing (' || current_database() || ')'
       end as resultado

union all

-- =====================================================================
-- 1 · ¿Existe la tabla de reseñas?
-- =====================================================================
select '1 · tabla reviews',
       case when to_regclass('public.reviews') is null
            then 'MAL · no existe. Aplica 20260810_reviews.sql'
            else 'OK · existe' end

union all

-- =====================================================================
-- 2 · ¿Quien tiene acceso al panel y con que rol?
-- =====================================================================
-- Si el email de Holman NO sale aqui, esa es la causa del "no me deja entrar":
-- sin fila en profiles no hay rol, y el panel no abre.
-- Si sale con rol 'vendor', puede entrar y mirar, pero NO puede subir reseñas
-- (is_admin() excluye vendor desde la migracion 20260518).
select '2 · usuarios del panel',
       coalesce(
         nullif(string_agg(email || ' -> ' || role, ', ' order by role, email), ''),
         'MAL · la tabla profiles esta vacia: nadie puede entrar'
       )
  from profiles

union all

-- =====================================================================
-- 3 · ¿Hay usuarios de auth SIN perfil? (el sintoma exacto del rebote al login)
-- =====================================================================
select '3 · auth sin perfil',
       coalesce(
         nullif(string_agg(u.email, ', ' order by u.email), ''),
         'OK · todos los usuarios de auth tienen su fila en profiles'
       )
  from auth.users u
  left join profiles p on p.id = u.id
 where p.id is null;

-- =====================================================================
-- 4 · Las reseñas, por estado  (consulta aparte: si la tabla no existiera,
--     el parser tumbaria toda la verificacion de arriba)
-- =====================================================================
-- 'aprobado'  = visible en la web
-- 'pendiente' = guardada pero OCULTA  <-- si estan todas aqui, es esto
select status, count(*) as cuantas, min(created_at) as primera, max(created_at) as ultima
  from reviews
 group by status
 order by status;

-- Las 20 mas recientes, para confirmar que son las que subio Holman.
select id, name, role, rating, status, photo_path is not null as tiene_foto, created_at
  from reviews
 order by created_at desc
 limit 20;

-- =====================================================================
-- 5 · Storage: bucket y policies de las fotos
-- =====================================================================
select 'bucket resenas' as chequeo,
       coalesce(
         (select case when public
                      then 'OK · publico, ' || coalesce(file_size_limit, 0) / 1048576 || ' MB'
                      else 'MAL · el bucket no es publico: las fotos no se ven' end
            from storage.buckets where id = 'resenas'),
         'MAL · no existe el bucket resenas'
       ) as resultado
union all
select 'policies storage',
       coalesce(
         nullif(string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname), ''),
         'MAL · storage.objects no tiene ninguna policy resenas_*'
       )
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects' and policyname like 'resenas\_%';


-- =====================================================================
-- ARREGLOS  —  ejecuta SOLO el que corresponda a lo que salio arriba
-- =====================================================================

-- (A) El usuario no tiene perfil, o lo tiene como 'vendor' y necesita subir
--     reseñas. Sustituye el email y descomenta:
--
-- insert into profiles (id, email, name, role)
-- select u.id, u.email, coalesce(u.raw_user_meta_data->>'name', u.email), 'admin'
--   from auth.users u
--  where u.email = 'EMAIL-DE-HOLMAN'
-- on conflict (id) do update set role = 'admin';
--
-- Despues: cerrar sesion y volver a entrar (el rol se lee en cada peticion,
-- pero conviene refrescar el token).

-- (B) Las reseñas existen pero estan en 'pendiente' (ocultas). Para
--     republicarlas todas de golpe:
--
-- update reviews set status = 'aprobado' where status = 'pendiente';
--
-- (o de una en una desde /admin/resenas, que es lo recomendable si alguna se
--  oculto a proposito).

-- (C) Las reseñas no aparecen por ningun lado en ESTE proyecto: mira si se
--     cargaron en el del CRM/DelegaWork. Alli quedo una tabla `reviews`
--     huerfana de cuando la migracion se pego en el proyecto equivocado.
--     Corre esto en el OTRO proyecto para comprobarlo:
--
-- select count(*) from reviews;
--
--     Si estan alli, exportalas (Table Editor -> Export CSV) e importalas en el
--     proyecto de la landing. No copies la columna id: deja que se regenere.

-- (D) Faltan las policies de Storage: aplica 20260812_reviews_storage_fix.sql
