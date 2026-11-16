-- Nadie cobra comisión por su propia compra (27 oct 2026).
--
-- Las ventas que se registran en la Torre (manual_sales) llegan sin buyer_id,
-- y hgg_quien_trajo() puede devolver al mismo comprador (p. ej. si se invitó
-- a sí mismo a la masterclass). Así a Genaro le salió un 15% por su propio
-- Programa Fundador (se anuló a mano). Ahora también se compara el correo del
-- comprador con el de quien cobraría, tanto para el embajador como para el
-- closer.
--
-- Se puede correr más de una vez.

create or replace function hgg_award_commission(
  p_referrer   uuid,
  p_source     text,
  p_source_id  text,
  p_buyer_id   uuid,
  p_buyer_email text,
  p_buyer_name text,
  p_concept    text,
  p_base       numeric,
  p_pct        numeric default 10.0
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind    text;
  v_previas int;
  v_id      bigint;
begin
  if p_referrer is null or p_base is null or p_base <= 0 then
    return null;
  end if;

  v_kind := hgg_referrer_kind(p_referrer);
  if v_kind is null then
    return null;  -- ya no esta habilitado para referir
  end if;

  -- Nadie cobra por su propia compra: ni por la cuenta ni por el correo
  -- (las ventas de la Torre llegan sin buyer_id).
  if p_buyer_id is not null and p_buyer_id = p_referrer then
    return null;
  end if;
  if p_buyer_email is not null and exists (
    select 1 from auth.users u
    where u.id = p_referrer and lower(u.email) = lower(trim(p_buyer_email))
  ) then
    return null;
  end if;

  -- El afiliado cobra una sola vez por cada persona que trae. El embajador,
  -- siempre. Por eso se miran las comisiones previas de ESE comprador.
  if v_kind = 'afiliado' then
    select count(*) into v_previas
    from hgg_commissions
    where referrer_id = p_referrer
      and status <> 'anulada'
      and (
        (p_buyer_id is not null and buyer_id = p_buyer_id)
        or (p_buyer_email is not null and lower(buyer_email) = lower(p_buyer_email))
      );
    if v_previas > 0 then
      return null;
    end if;
  end if;

  insert into hgg_commissions
    (referrer_id, source, source_id, buyer_id, buyer_email, buyer_name,
     concept, base_amount, pct, amount, referrer_kind)
  values
    (p_referrer, p_source, p_source_id, p_buyer_id, p_buyer_email, p_buyer_name,
     p_concept, p_base, p_pct, round(p_base * p_pct / 100.0, 2), v_kind)
  on conflict (source, source_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function hgg_award_closer(
  p_sale_id text, p_email text, p_name text, p_concept text, p_base numeric
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anf  text;
  v_user uuid;
  v_correo text;
  v_id   bigint;
begin
  if p_email is null or p_base is null or p_base <= 0 then
    return null;
  end if;
  select c.anfitrion into v_anf from hgg_citas c
  where lower(c.email) = lower(trim(p_email)) and c.tipo = 'claridad' and c.estado <> 'cancelada'
    and c.inicio <= now()
  order by c.inicio desc limit 1;
  if v_anf is null or v_anf = 'holman' then
    return null;
  end if;
  select u.id, f.correo into v_user, v_correo from hgg_agenda_anfitriones f
  join auth.users u on lower(u.email) = lower(f.correo)
  where f.id = v_anf;
  if v_user is null or lower(v_correo) = lower(trim(p_email)) then
    return null;  -- sin closer, o el closer se compró a sí mismo
  end if;
  insert into hgg_commissions
    (referrer_id, source, source_id, buyer_email, buyer_name, concept, base_amount, pct, amount, referrer_kind)
  values
    (v_user, 'closer', p_sale_id, p_email, p_name, p_concept, p_base, 10, round(p_base * 0.10, 2), 'closer')
  on conflict (source, source_id) do nothing
  returning id into v_id;
  return v_id;
end;
$$;
