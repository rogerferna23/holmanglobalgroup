-- Finanzas: la plantilla financiera y comercial de Holman dentro de la Torre (oct 2026).
--
-- Un periodo por mes con sus parámetros (saldo inicial, tasa, presupuesto
-- personal) y las filas de cada hoja: embajadores, ventas (proyectadas y
-- reales), costos (presupuesto y real) y deudas (plan y pagado). Cada hoja
-- guarda sus columnas en `datos` (jsonb); los cálculos se hacen en el
-- navegador (src/lib/finanzas.ts) y en el Excel que se descarga.
--
-- Son las finanzas PERSONALES de quien las escribe (incluye sus deudas), así
-- que cada fila es de su dueño: ni otro admin las ve. La guarda es doble: el
-- dueño y, además, rol de administración.

create table if not exists hgg_fin_periodos (
  id                    text primary key default gen_random_uuid()::text,
  owner                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Primer día del mes que se planifica.
  mes                   date not null,
  saldo_inicial         numeric,
  tasa                  numeric,
  presupuesto_personal  numeric,
  pct_comision          numeric,
  pct_cobro             numeric,
  -- Lo que de verdad había en cuentas al cerrar el mes (para cuadrar contra el flujo real).
  saldo_final_real      numeric,
  -- Por semana: otros ingresos, gastos personales y ahorro, proyectado y real.
  semanas               jsonb not null default '[]'::jsonb,
  notas                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (owner, mes)
);

create table if not exists hgg_fin_filas (
  id          text primary key default gen_random_uuid()::text,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  periodo_id  text not null references hgg_fin_periodos (id) on delete cascade,
  hoja        text not null check (hoja in ('embajadores', 'ventas', 'costos', 'deudas')),
  orden       integer not null default 0,
  datos       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists hgg_fin_filas_periodo_idx on hgg_fin_filas (periodo_id, hoja, orden);

alter table hgg_fin_periodos enable row level security;
alter table hgg_fin_filas enable row level security;

drop policy if exists hgg_fin_periodos_duenio on hgg_fin_periodos;
create policy hgg_fin_periodos_duenio on hgg_fin_periodos for all
  using (owner = auth.uid() and is_admin())
  with check (owner = auth.uid() and is_admin());

drop policy if exists hgg_fin_filas_duenio on hgg_fin_filas;
create policy hgg_fin_filas_duenio on hgg_fin_filas for all
  using (owner = auth.uid() and is_admin())
  with check (
    owner = auth.uid() and is_admin()
    and exists (select 1 from hgg_fin_periodos p where p.id = periodo_id and p.owner = auth.uid())
  );
