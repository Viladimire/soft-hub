create table if not exists public.admin_config (
  id integer primary key default 1,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint admin_config_singleton check (id = 1)
);

create or replace function public.is_admin() returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'admin';
$$;

create or replace function public.is_service_role() returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

alter table public.admin_config enable row level security;

drop policy if exists "admin_config_admin_read" on public.admin_config;
create policy "admin_config_admin_read"
  on public.admin_config
  for select
  using (public.is_admin() or public.is_service_role());

drop policy if exists "admin_config_admin_write" on public.admin_config;
create policy "admin_config_admin_write"
  on public.admin_config
  for all
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_config_updated_at on public.admin_config;
create trigger trg_admin_config_updated_at
before update on public.admin_config
for each row execute function public.touch_updated_at();
