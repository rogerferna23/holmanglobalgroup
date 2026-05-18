-- ============================================
-- MIGRACION BASE: tablas operacionales
-- Ejecutar PRIMERO de todas, antes de profiles_and_rls.
-- ============================================

-- manual_sales: registro de todas las ventas (manuales + Stripe)
create table if not exists manual_sales (
  id            text primary key,
  date          date not null default current_date,
  service_id    text not null,
  service_title text not null,
  client_name   text not null,
  client_email  text not null,
  client_phone  text,
  origin        text not null default 'manual',
  notes         text,
  amount        numeric(12, 2) not null,
  status        text not null default 'Pendiente' check (status in ('Aprobado', 'Pendiente', 'Cancelado')),
  created_at    timestamptz not null default now()
);
create index if not exists manual_sales_date_idx on manual_sales (date desc);
create index if not exists manual_sales_status_idx on manual_sales (status);

-- expenses: gastos del negocio
create table if not exists expenses (
  id          text primary key,
  date        date not null default current_date,
  description text not null,
  category    text,
  amount      numeric(12, 2) not null,
  created_at  timestamptz not null default now()
);
create index if not exists expenses_date_idx on expenses (date desc);

-- vendors: equipo / colaboradores
create table if not exists vendors (
  id         text primary key,
  name       text not null,
  initials   text,
  specialty  text,
  phone      text,
  email      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- approval_requests: cosas que requieren aprobación
create table if not exists approval_requests (
  id         text primary key,
  type       text not null check (type in ('manual_sale', 'vendor', 'transaction')),
  payload    jsonb not null default '{}'::jsonb,
  status     text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  created_at timestamptz not null default now()
);
create index if not exists approval_requests_status_idx on approval_requests (status);

-- audit_log: registro inmutable de acciones sensibles
create table if not exists audit_log (
  id          bigserial primary key,
  action      text not null,
  resource    text not null,
  resource_id text not null,
  user_email  text,
  metadata    jsonb,
  status      text not null check (status in ('success', 'failure')),
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log (created_at desc);
create index if not exists audit_log_resource_idx on audit_log (resource, resource_id);

-- Tablas legado (compatibilidad con código antiguo, sin uso real)
create table if not exists admin_users (
  id         text primary key,
  email      text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  id         text primary key,
  user_id    text,
  created_at timestamptz not null default now()
);

-- VERIFICACION
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
