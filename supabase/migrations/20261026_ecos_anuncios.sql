-- Anuncios del club (ecos-anuncio): qué anuncio le llegó a qué miembro, para
-- que nadie lo reciba dos veces si el envío se repite.
-- Se puede correr más de una vez.
create table if not exists ecos_anuncios_enviados (
  anuncio   text not null,
  member_id uuid not null references auth.users(id) on delete cascade,
  sent_at   timestamptz not null default now(),
  primary key (anuncio, member_id)
);
alter table ecos_anuncios_enviados enable row level security;
revoke all on ecos_anuncios_enviados from anon, authenticated;
