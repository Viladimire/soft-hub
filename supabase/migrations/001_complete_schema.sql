--
-- Supabase Schema: Foundation & Data Phase
--

-- Enable required extensions -------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- Schema grants ----------------------------------------------------------------
grant usage on schema public to "anon", "authenticated", "service_role";

-- Core table: software ---------------------------------------------------------
create table if not exists public.software (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text,
  description text not null,
  version text not null,
  size_in_bytes bigint,
  platforms text[] not null default '{}',
  categories text[] not null default '{}',
  type text not null,
  website_url text,
  download_url text not null,
  developer jsonb not null default '{}'::jsonb,
  features text[] not null default '{}',
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  release_date date,
  stats jsonb not null default '{}'::jsonb,
  media jsonb not null default '{}'::jsonb,
  downloads_count bigint generated always as (coalesce(((stats ->> 'downloads'))::bigint, 0)) stored,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce((developer ->> 'name'), '')), 'B')
  ) stored,
  requirements jsonb,
  changelog jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist when table pre-created ---------------------------------
alter table public.software
  add column if not exists summary text;

alter table public.software
  add column if not exists developer jsonb not null default '{}'::jsonb;

alter table public.software
  add column if not exists features text[] not null default '{}';

alter table public.software
  add column if not exists is_trending boolean not null default false;

alter table public.software
  add column if not exists stats jsonb not null default '{}'::jsonb;

alter table public.software
  add column if not exists media jsonb not null default '{}'::jsonb;

alter table public.software
  add column if not exists downloads_count bigint generated always as (coalesce(((stats ->> 'downloads'))::bigint, 0)) stored;

alter table public.software
  add column if not exists requirements jsonb;

alter table public.software
  add column if not exists changelog jsonb;

alter table public.software
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce((developer ->> 'name'), '')), 'B')
  ) stored;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  software_id uuid not null references public.software(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'download', 'share')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Specialized tables -----------------------------------------------------------
create table if not exists public.games (
  software_id uuid primary key references public.software(id) on delete cascade,
  genres text[] not null default '{}',
  modes text[] not null default '{}',
  monetization text,
  is_free boolean not null default false,
  is_open_source boolean not null default false,
  repositories jsonb not null default '[]'::jsonb,
  age_rating text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operating_systems (
  software_id uuid primary key references public.software(id) on delete cascade,
  kernel text,
  based_on text,
  architectures text[] not null default '{}',
  support_status text,
  lifecycle jsonb not null default '{}'::jsonb,
  release_channel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.multimedia (
  software_id uuid primary key references public.software(id) on delete cascade,
  media_types text[] not null default '{}',
  supports_streaming boolean not null default false,
  supports_editing boolean not null default false,
  codecs_supported text[] not null default '{}',
  integrations text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.utilities (
  software_id uuid primary key references public.software(id) on delete cascade,
  utility_type text not null,
  automation_features text[] not null default '{}',
  integrations text[] not null default '{}',
  telemetry jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.films (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  release_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for software ---------------------------------------------------------
create index if not exists idx_software_category on public.software using gin (categories);
create index if not exists idx_software_platforms on public.software using gin (platforms);
create unique index if not exists idx_software_slug on public.software (slug);
create index if not exists idx_software_featured on public.software (is_featured) where is_featured = true;
create index if not exists idx_software_downloads_count on public.software (downloads_count desc);

create index if not exists idx_software_search_vector on public.software using gin (search_vector);
create index if not exists idx_software_search on public.software using gin (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

create index if not exists idx_analytics_events_software_id on public.analytics_events (software_id);

-- Row Level Security -----------------------------------------------------------
alter table public.software enable row level security;
alter table public.categories enable row level security;
alter table public.games enable row level security;
alter table public.operating_systems enable row level security;
alter table public.multimedia enable row level security;
alter table public.utilities enable row level security;
alter table public.films enable row level security;
alter table public.analytics_events enable row level security;

-- Shared policy helpers
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
  select auth.role() = 'service_role';
$$;

--- Software policies ------------------------------------------------------------
drop policy if exists "software_public_read" on public.software;
create policy "software_public_read"
  on public.software
  for select
  using (true);

drop policy if exists "software_admin_insert" on public.software;
create policy "software_admin_insert"
  on public.software
  for insert
  to authenticated
  with check (public.is_admin() or public.is_service_role());

drop policy if exists "software_admin_update" on public.software;
create policy "software_admin_update"
  on public.software
  for update
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());

drop policy if exists "software_admin_delete" on public.software;
create policy "software_admin_delete"
  on public.software
  for delete
  to authenticated
  using (public.is_admin() or public.is_service_role());

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
  on public.categories
  for select
  using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
  on public.categories
  for all
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());

-- Games policies ----------------------------------------------------------------
drop policy if exists "games_public_read" on public.games;
create policy "games_public_read"
  on public.games
  for select
  using (true);

drop policy if exists "games_admin_write" on public.games;
create policy "games_admin_write"
  on public.games
  for all
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());

-- Operating Systems policies ----------------------------------------------------
drop policy if exists "operating_systems_public_read" on public.operating_systems;
create policy "operating_systems_public_read"
  on public.operating_systems
  for select
  using (true);

drop policy if exists "operating_systems_admin_write" on public.operating_systems;
create policy "operating_systems_admin_write"
  on public.operating_systems
  for all
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());

-- Multimedia policies -----------------------------------------------------------
drop policy if exists "multimedia_public_read" on public.multimedia;
create policy "multimedia_public_read"
  on public.multimedia
  for select
  using (true);

drop policy if exists "multimedia_admin_write" on public.multimedia;
create policy "multimedia_admin_write"
  on public.multimedia
  for all
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());

-- Utilities policies ------------------------------------------------------------
drop policy if exists "utilities_public_read" on public.utilities;
create policy "utilities_public_read"
  on public.utilities
  for select
  using (true);

drop policy if exists "utilities_admin_write" on public.utilities;
create policy "utilities_admin_write"
  on public.utilities
  for all
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());

-- Films policies ----------------------------------------------------------------
drop policy if exists "films_public_read" on public.films;
create policy "films_public_read"
  on public.films
  for select
  using (true);

drop policy if exists "films_admin_write" on public.films;
create policy "films_admin_write"
  on public.films
  for all
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());

drop policy if exists "analytics_events_admin_read" on public.analytics_events;
create policy "analytics_events_admin_read"
  on public.analytics_events
  for select
  using (public.is_admin() or public.is_service_role());

drop policy if exists "analytics_events_service_insert" on public.analytics_events;
create policy "analytics_events_service_insert"
  on public.analytics_events
  for insert
  to authenticated
  with check (public.is_admin() or public.is_service_role());
