create table if not exists public.admin_config (
  id integer primary key default 1,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint admin_config_singleton check (id = 1)
);

alter table public.admin_config enable row level security;
