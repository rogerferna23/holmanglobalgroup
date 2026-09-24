-- A quien ya se le mando la bienvenida (y a Holman el aviso de su registro).
-- Solo la escribe la funcion ecos-bienvenida con service_role: sin politicas,
-- nadie mas la lee ni la toca. Asi cada persona recibe el correo una sola vez.
create table if not exists ecos_avisos (
  member_id     uuid primary key references auth.users(id) on delete cascade,
  bienvenida_at timestamptz not null default now()
);
alter table ecos_avisos enable row level security;

-- Los que ya estaban registrados no reciben una bienvenida tardia.
insert into ecos_avisos (member_id)
select id from ecos_members
on conflict do nothing;

select count(*) as ya_registrados_sin_correo from ecos_avisos;
