-- Cuántas veces se abrió la agenda desde el enlace de cada embajador.
--
-- /agendar?ref=CODIGO muestra dos pasos; al tocar «Abrir la agenda» (que se
-- abre en DelegaWork, otra pestaña) el sitio registra una apertura a nombre
-- del dueño del código. DelegaWork no guarda de quién viene la persona, así
-- que esto es lo único automático: un conteo, sin nombres ni datos de quien
-- agenda. Quién agendó lo avisa el embajador con el botón «Avisar a HGG».
--
-- Se puede correr más de una vez.

create table if not exists hgg_agenda_aperturas (
  id         bigserial primary key,
  referrer   uuid not null references auth.users (id) on delete cascade,
  -- Identificador al azar del navegador (localStorage), para no contar cinco
  -- veces a la misma persona que toca el botón varias veces.
  visita     text not null,
  created_at timestamptz not null default now()
);

create index if not exists hgg_agenda_aperturas_referrer_idx
  on hgg_agenda_aperturas (referrer, created_at desc);

-- Sin políticas: nadie la lee ni la escribe directo; solo por las funciones.
alter table hgg_agenda_aperturas enable row level security;

-- Registrar una apertura (pública: la llama quien abre el enlace, sin cuenta).
-- Un código que no existe no hace nada. La misma visita cuenta una vez por día.
create or replace function hgg_registrar_apertura_agenda(p_code text, p_visita text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref uuid := hgg_resolve_code(left(coalesce(p_code, ''), 32));
  v_vis text := left(coalesce(nullif(trim(p_visita), ''), 'sin-id'), 64);
begin
  if v_ref is null then
    return;
  end if;
  if exists (
    select 1 from hgg_agenda_aperturas
    where referrer = v_ref and visita = v_vis and created_at > now() - interval '1 day'
  ) then
    return;
  end if;
  insert into hgg_agenda_aperturas (referrer, visita) values (v_ref, v_vis);
end;
$$;

revoke all on function hgg_registrar_apertura_agenda(text, text) from public;
grant execute on function hgg_registrar_apertura_agenda(text, text) to anon, authenticated;

-- El embajador ve las suyas: este mes y en total.
create or replace function hgg_mis_aperturas_agenda()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'mes', count(*) filter (where created_at >= date_trunc('month', now())),
    'total', count(*)
  )
  from hgg_agenda_aperturas
  where referrer = auth.uid();
$$;

revoke all on function hgg_mis_aperturas_agenda() from public, anon;
grant execute on function hgg_mis_aperturas_agenda() to authenticated;

-- El admin ve las de cualquier persona (ficha del miembro).
create or replace function hgg_aperturas_agenda_de(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not is_admin() then
    raise exception 'solo administradores';
  end if;
  return (
    select json_build_object(
      'mes', count(*) filter (where created_at >= date_trunc('month', now())),
      'total', count(*)
    )
    from hgg_agenda_aperturas
    where referrer = p_id
  );
end;
$$;

revoke all on function hgg_aperturas_agenda_de(uuid) from public, anon;
grant execute on function hgg_aperturas_agenda_de(uuid) to authenticated;
