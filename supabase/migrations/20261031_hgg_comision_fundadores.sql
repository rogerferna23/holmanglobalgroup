-- Comisión especial por persona: los Fundadores Elite ganan 15% (oct 2026).
--
-- La regla general sigue siendo 10%. Holman decidió darles 15% a los diez del
-- Programa Fundador sobre lo que vendan de HGG (Sentido, Marca con Huella…)
-- como impulso. En DelegaWork Holman cobra ~26% y les paga el 15% a mano;
-- aquí solo se ve en su panel. La membresía de ECOS sigue al 10%.
--
-- Una tabla aparte (y no una columna en ecos_members) para que nadie se la
-- pueda cambiar desde su propio perfil: solo los admins escriben.
--
-- Lo ya causado no se mueve: el % se fija al causarse cada comisión.
--
-- Se puede correr más de una vez.

create table if not exists hgg_comision_especial (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  -- Sobre las ventas de productos de HGG (no la membresía del club).
  pct         numeric(5,2) not null check (pct > 0 and pct <= 50),
  motivo      text,
  -- Hasta cuándo vale; null = sin fecha.
  hasta       timestamptz,
  created_at  timestamptz not null default now()
);

alter table hgg_comision_especial enable row level security;
drop policy if exists hgg_comision_especial_propia on hgg_comision_especial;
create policy hgg_comision_especial_propia on hgg_comision_especial
  for select using (user_id = auth.uid());
drop policy if exists hgg_comision_especial_admin on hgg_comision_especial;
create policy hgg_comision_especial_admin on hgg_comision_especial
  for all using (is_admin()) with check (is_admin());

-- Al causarse una comisión de producto, si quien refirió tiene un % especial
-- vigente, se usa ese. Va en la base para que ningún webhook tenga que saberlo.
create or replace function hgg_commissions_pct_especial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pct numeric;
begin
  if new.source = 'producto' then
    select pct into v_pct from hgg_comision_especial
    where user_id = new.referrer_id and (hasta is null or hasta > now());
    if v_pct is not null and v_pct > new.pct then
      new.pct := v_pct;
      new.amount := round(new.base_amount * v_pct / 100.0, 2);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists hgg_commissions_pct_especial on hgg_commissions;
create trigger hgg_commissions_pct_especial before insert on hgg_commissions
  for each row execute function hgg_commissions_pct_especial();

-- Los Fundadores Elite: quien tenga el Programa Fundador. Lizmar entra sola
-- al correr esto otra vez cuando su programa tenga cuenta.
insert into hgg_comision_especial (user_id, pct, motivo)
select distinct p.user_id, 15, 'Fundadores Elite'
from hgg_programas p
where p.producto = 'fundador' and p.user_id is not null
on conflict (user_id) do nothing;

-- Para revisar: quiénes quedaron con 15%.
select e.pct, e.motivo, coalesce(pr.name, u.email) as quien
from hgg_comision_especial e
join auth.users u on u.id = e.user_id
left join profiles pr on pr.id = e.user_id
order by 3;
