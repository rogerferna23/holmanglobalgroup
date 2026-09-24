-- Supabase le da permiso de ejecutar a `anon` (visitante sin sesion) en toda
-- funcion nueva del esquema public, aparte del `public` que ya se revoco. Estas
-- dos no le sirven de nada a un visitante: se le quita el permiso.
revoke execute on function hgg_nuevo_codigo() from anon;
revoke execute on function ecos_unirse_prueba(text) from anon;
