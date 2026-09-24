-- Ajustes de la revision del club (24 sep 2026). Se puede correr mas de una vez.
-- Va DESPUES de 20260929_ecos_prueba_sin_tarjeta.sql (usa ecos_trial_end()).

-- 1. El profesor solo cambia lo suyo de la clase --------------------------
-- La regla de la base le dejaba cambiar fecha, tipo, si esta publicada o si
-- admite invitados. Desde su panel solo toca tema, descripcion y su enlace de
-- Zoom; ahora la base tampoco le deja mas.
create or replace function ecos_sessions_guard_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or is_admin() then
    return new;
  end if;
  new.id             := old.id;
  new.starts_at      := old.starts_at;
  new.kind           := old.kind;
  new.subject        := old.subject;
  new.teacher        := old.teacher;
  new.teacher_id     := old.teacher_id;
  new.recording_id   := old.recording_id;
  new.open_to_guests := old.open_to_guests;
  new.published      := old.published;
  new.created_at     := old.created_at;
  return new;
end;
$$;

drop trigger if exists ecos_sessions_guard_teacher on ecos_sessions;
create trigger ecos_sessions_guard_teacher
  before update on ecos_sessions
  for each row execute function ecos_sessions_guard_teacher();

-- 2. En el directorio aparece todo el que esta dentro ---------------------
-- Antes solo quien pagaba: faltaban los profesores (Holman incluido), las
-- cortesias y quien esta en su mes gratis. Misma regla que is_ecos_member().
create or replace function ecos_directory()
returns table (
  id uuid, name text, city text, country text, business text,
  level_ventas int, level_marketing int, level_oratoria int, badges text[], since timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select m.id, m.name, m.city, m.country, m.business,
    ecos_level(coalesce((select sum(points)::int from ecos_xp_events x where x.member_id = m.id and x.skill = 'ventas'), 0)),
    ecos_level(coalesce((select sum(points)::int from ecos_xp_events x where x.member_id = m.id and x.skill = 'marketing'), 0)),
    ecos_level(coalesce((select sum(points)::int from ecos_xp_events x where x.member_id = m.id and x.skill = 'oratoria'), 0)),
    coalesce((select array_agg(badge) from ecos_badges b where b.member_id = m.id), '{}'),
    coalesce(m.started_at, m.created_at)
  from ecos_members m
  where m.show_in_directory
    and (
      m.status = 'activo' or m.teacher or m.cortesia
      or (m.status = 'pendiente' and m.founder and now() < ecos_trial_end())
    )
    and is_ecos_member()
  order by coalesce(m.started_at, m.created_at) desc nulls last;
$$;

-- 3. El enlace de quien esta en su mes gratis ya sirve ---------------------
-- Antes el codigo de alguien en prueba no se resolvia y quien entraba por su
-- enlace quedaba sin nadie. Ahora queda asociado a esa persona; la comision
-- la sigue decidiendo hgg_award_commission al momento de cada compra: si
-- quien refirio todavia no activo, esa compra no paga, pero las siguientes si
-- en cuanto active.
create or replace function hgg_resolve_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select r.id from hgg_referrers r
  where (lower(r.code) = lower(trim(p_code)) or lower(r.old_code) = lower(trim(p_code)))
    and (
      hgg_referrer_kind(r.id) is not null
      or exists (
        select 1 from ecos_members m
        where m.id = r.id and m.status = 'pendiente' and m.founder and now() < ecos_trial_end()
      )
    )
  order by (lower(r.code) = lower(trim(p_code))) desc
  limit 1;
$$;

-- Para revisar
select count(*) as en_el_directorio from ecos_members
where show_in_directory and (status = 'activo' or teacher or cortesia
  or (status = 'pendiente' and founder and now() < ecos_trial_end()));
