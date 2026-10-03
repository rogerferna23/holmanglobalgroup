-- «Te invitó Andrés»: el nombre de pila de quien comparte el enlace.
--
-- Quien llega por /ecos?ref=CODIGO ve quién lo invitó en la página del club y
-- al crear su cuenta. Da confianza y confirma que va por el enlace correcto.
--
-- Es publica (anon) a proposito, asi que devuelve lo minimo: solo el primer
-- nombre, y solo si el codigo es valido hoy (la misma regla de
-- hgg_resolve_code). Nada de correo, apellido ni id.
--
-- Se puede correr mas de una vez.

create or replace function hgg_quien_invita(p_code text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select nullif(split_part(trim(coalesce(m.name, p.name, '')), ' ', 1), '')
  from (select hgg_resolve_code(left(coalesce(p_code, ''), 32)) as id) r
  left join ecos_members m on m.id = r.id
  left join profiles p on p.id = r.id
  where r.id is not null;
$$;

revoke all on function hgg_quien_invita(text) from public;
grant execute on function hgg_quien_invita(text) to anon, authenticated;
