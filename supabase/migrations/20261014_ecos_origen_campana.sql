-- De donde llega cada miembro: campana pagada o no.
--
-- Roger cobra su 20% solo sobre los miembros que llegan por sus campanas
-- (pauta). Para calcularlo hace falta saber, por miembro, si vino de una.
--
-- Como se marca:
--  1. El sitio detecta la visita de campana (utm_medium=paid/cpc/ads…, o
--     gclid/ttclid/msclkid) y la guarda en el navegador 60 dias.
--  2. Al crear la cuenta viaja en el metadata del registro (`campana`).
--  3. Al crearse la ficha en ecos_members (mes gratis o primer pago), este
--     trigger la lee de auth.users y marca de_campana.
--  4. El admin la corrige a mano desde la ficha si hace falta.
--
-- El miembro no puede cambiarla: el guardia la protege igual que el estado.
--
-- Se puede correr mas de una vez.

alter table ecos_members add column if not exists de_campana boolean not null default false;
alter table ecos_members add column if not exists campana jsonb;

comment on column ecos_members.de_campana is
  'Llego por una campana pagada. El socio de campanas (Roger) cobra su % solo sobre estos.';
comment on column ecos_members.campana is
  'Datos de la visita de campana: utm_source, utm_medium, utm_campaign, clic, fecha.';

-- 1. Al crear la ficha, se copia lo que quedo en el registro -------------
create or replace function ecos_members_marcar_campana()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c jsonb;
begin
  if new.de_campana then return new; end if;
  select raw_user_meta_data -> 'campana' into v_c from auth.users where id = new.id;
  if v_c is not null and jsonb_typeof(v_c) = 'object' then
    new.de_campana := true;
    new.campana := v_c;
  end if;
  return new;
end;
$$;

drop trigger if exists ecos_members_marcar_campana on ecos_members;
create trigger ecos_members_marcar_campana
  before insert on ecos_members
  for each row execute function ecos_members_marcar_campana();

-- 2. El guardia: lo mismo de antes + de_campana y campana -----------------
create or replace function ecos_members_guard_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (Edge Functions), admins y las funciones del sistema pueden todo.
  if auth.role() = 'service_role' or is_admin()
     or coalesce(current_setting('ecos.sistema', true), '') = '1' then
    return new;
  end if;
  -- Un miembro solo cambia lo suyo de perfil.
  new.email                  := old.email;
  new.status                 := old.status;
  new.price_usd              := old.price_usd;
  new.founder                := old.founder;
  new.teacher                := old.teacher;
  new.cortesia               := old.cortesia;
  new.plan                   := old.plan;
  new.started_at             := old.started_at;
  new.current_period_end     := old.current_period_end;
  new.cancelled_at           := old.cancelled_at;
  new.inactive_since         := old.inactive_since;
  new.stripe_customer_id     := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.referred_by            := old.referred_by;
  new.referral_code          := old.referral_code;
  new.referral_credited      := old.referral_credited;
  new.free_months_earned     := old.free_months_earned;
  new.free_months_used       := old.free_months_used;
  new.de_campana             := old.de_campana;
  new.campana                := old.campana;
  new.created_at             := old.created_at;
  return new;
end;
$$;

-- 3. Los que ya estan y se registraron con datos de campana -------------
update ecos_members m
set de_campana = true,
    campana = u.raw_user_meta_data -> 'campana'
from auth.users u
where u.id = m.id
  and not m.de_campana
  and jsonb_typeof(u.raw_user_meta_data -> 'campana') = 'object';

-- Para revisar: cuantos hay de campana.
select de_campana, count(*) from ecos_members group by 1;
