-- Equipo por cliente y bitácora de redes (23 nov 2026).
--
-- Decidido con Holman:
--   · Sol (Directora Comercial) lleva las redes de algunos clientes. Entra
--     desde SU panel del club, no desde la Torre: ve una sección «Mis clientes»
--     con solo los programas que Holman le asigna.
--   · No ve la vista completa del cliente (meta, creencias, rueda, actas): solo
--     nombre, programa, etapa y lo de redes. Por eso NO tiene policy sobre
--     hgg_programas; lee lo suyo por hgg_equipo_mis_clientes().
--   · Anota tres cosas: publicaciones (con estado), números del mes por red y
--     notas de avance. El cliente las ve en «Mi proceso» → «Tus redes» y
--     aprueba las piezas que están «para aprobar».
--   · La asignación es por correo (igual que los anfitriones de la agenda):
--     basta con que Sol entre al club con ese correo.
--
-- Se puede correr más de una vez.

-- 1. Quién del equipo acompaña a cada cliente ---------------------------------
create table if not exists hgg_programa_equipo (
  id           text primary key default gen_random_uuid()::text,
  programa_id  text not null references hgg_programas (id) on delete cascade,
  email        text not null,
  nombre       text not null,
  rol          text not null default 'redes',
  created_at   timestamptz not null default now(),
  unique (programa_id, email)
);
create index if not exists hgg_programa_equipo_email_idx on hgg_programa_equipo (lower(email));

-- 2. Redes: publicaciones, números del mes y notas -----------------------------
create table if not exists hgg_redes_publicaciones (
  id           text primary key default gen_random_uuid()::text,
  programa_id  text not null references hgg_programas (id) on delete cascade,
  fecha        date not null default current_date,
  red          text not null default 'instagram',
  tipo         text not null default 'post',
  titulo       text not null,
  enlace       text,
  -- diseno → aprobar (el cliente la ve con botón) → aprobada → publicada
  estado       text not null default 'diseno' check (estado in ('diseno', 'aprobar', 'aprobada', 'publicada')),
  autor        text,
  created_at   timestamptz not null default now()
);
create index if not exists hgg_redes_pub_prog_idx on hgg_redes_publicaciones (programa_id, fecha);

create table if not exists hgg_redes_numeros (
  id           text primary key default gen_random_uuid()::text,
  programa_id  text not null references hgg_programas (id) on delete cascade,
  -- Primer día del mes que se mide.
  mes          date not null,
  red          text not null default 'instagram',
  seguidores   int,
  alcance      int,
  mensajes     int,
  autor        text,
  created_at   timestamptz not null default now(),
  unique (programa_id, mes, red)
);

create table if not exists hgg_redes_notas (
  id           text primary key default gen_random_uuid()::text,
  programa_id  text not null references hgg_programas (id) on delete cascade,
  fecha        date not null default current_date,
  texto        text not null,
  -- Lo que se necesita del cliente (fotos, aprobar, datos). Opcional.
  necesita     text,
  autor        text,
  created_at   timestamptz not null default now()
);
create index if not exists hgg_redes_notas_prog_idx on hgg_redes_notas (programa_id, fecha);

-- 3. Seguridad -----------------------------------------------------------------
alter table hgg_programa_equipo      enable row level security;
alter table hgg_redes_publicaciones  enable row level security;
alter table hgg_redes_numeros        enable row level security;
alter table hgg_redes_notas          enable row level security;

create or replace function hgg_es_equipo_de(p_programa text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from hgg_programa_equipo
    where programa_id = p_programa
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function hgg_es_equipo_de(text) from public, anon;
grant execute on function hgg_es_equipo_de(text) to authenticated;

drop policy if exists hgg_equipo_admin on hgg_programa_equipo;
create policy hgg_equipo_admin on hgg_programa_equipo for all using (is_admin()) with check (is_admin());
drop policy if exists hgg_equipo_propio on hgg_programa_equipo;
create policy hgg_equipo_propio on hgg_programa_equipo for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
-- El cliente ve quién lleva sus redes.
drop policy if exists hgg_equipo_cliente on hgg_programa_equipo;
create policy hgg_equipo_cliente on hgg_programa_equipo for select using (hgg_es_mi_programa(programa_id));

do $$
declare t text;
begin
  foreach t in array array['hgg_redes_publicaciones', 'hgg_redes_numeros', 'hgg_redes_notas'] loop
    execute format('drop policy if exists %I on %I', t || '_admin', t);
    execute format('create policy %I on %I for all using (is_admin()) with check (is_admin())', t || '_admin', t);
    execute format('drop policy if exists %I on %I', t || '_equipo', t);
    execute format('create policy %I on %I for all using (hgg_es_equipo_de(programa_id)) with check (hgg_es_equipo_de(programa_id))', t || '_equipo', t);
    execute format('drop policy if exists %I on %I', t || '_cliente', t);
    execute format('create policy %I on %I for select using (hgg_es_mi_programa(programa_id))', t || '_cliente', t);
  end loop;
end $$;

-- 4. Lo que ve Sol de cada cliente (sin meta, creencias ni actas) ----------------
create or replace function hgg_equipo_mis_clientes()
returns table (
  id text, nombre text, email text, titulo text, producto text, etapas text[], etapa_actual int,
  estado text, inicio date, sesiones_total int, sesiones_hechas int, rol text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nombre, p.email, p.titulo, p.producto, p.etapas, p.etapa_actual,
         p.estado, p.inicio, p.sesiones_total,
         (select count(*)::int from hgg_programa_sesiones s where s.programa_id = p.id),
         e.rol
  from hgg_programa_equipo e
  join hgg_programas p on p.id = e.programa_id
  where lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by (p.estado = 'activo') desc, p.nombre;
$$;
revoke all on function hgg_equipo_mis_clientes() from public, anon;
grant execute on function hgg_equipo_mis_clientes() to authenticated;

-- 5. El cliente aprueba una pieza ----------------------------------------------
create or replace function hgg_redes_aprobar(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update hgg_redes_publicaciones set estado = 'aprobada'
  where id = p_id and estado = 'aprobar' and hgg_es_mi_programa(programa_id);
  if not found then raise exception 'Esa pieza no está para aprobar.'; end if;
end;
$$;
revoke all on function hgg_redes_aprobar(text) from public, anon;
grant execute on function hgg_redes_aprobar(text) to authenticated;
