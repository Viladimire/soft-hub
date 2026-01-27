create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

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

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  software_id uuid,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_created_at
  on public.analytics_events (created_at desc);

create index if not exists idx_analytics_events_software_id
  on public.analytics_events (software_id);

alter table public.analytics_events enable row level security;

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

create table if not exists public.analytics_search_events (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  filters jsonb,
  results_count integer,
  duration_ms integer,
  locale text,
  source text not null default 'site',
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_search_events_created_at
  on public.analytics_search_events (created_at desc);

create index if not exists idx_analytics_search_events_query
  on public.analytics_search_events using gin (to_tsvector('english', coalesce(query, '')));

alter table public.analytics_search_events enable row level security;

drop policy if exists "analytics_search_events_admin_read" on public.analytics_search_events;
create policy "analytics_search_events_admin_read"
  on public.analytics_search_events
  for select
  using (public.is_admin() or public.is_service_role());

drop policy if exists "analytics_search_events_service_insert" on public.analytics_search_events;
create policy "analytics_search_events_service_insert"
  on public.analytics_search_events
  for insert
  to authenticated
  with check (public.is_admin() or public.is_service_role());

create or replace function public.increment_software_stat(
  p_software_id uuid,
  p_field text,
  p_delta integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_value bigint;
begin
  if p_field not in ('views', 'downloads') then
    raise exception 'Unsupported stat field: %', p_field;
  end if;

  select coalesce((stats ->> p_field)::bigint, 0)
  into current_value
  from public.software
  where id = p_software_id
  for update;

  update public.software
  set stats = coalesce(stats, '{}'::jsonb) || jsonb_build_object(p_field, to_jsonb(current_value + p_delta))
  where id = p_software_id;
end;
$$;

create or replace function public.analytics_popular_software(p_limit integer default 10)
returns table (
  software_id uuid,
  name text,
  slug text,
  logo_url text,
  downloads bigint,
  views bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as software_id,
    s.name,
    s.slug,
    s.media ->> 'logoUrl' as logo_url,
    coalesce((s.stats ->> 'downloads')::bigint, 0) as downloads,
    coalesce((s.stats ->> 'views')::bigint, 0) as views
  from public.software s
  order by downloads desc, views desc, s.updated_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.analytics_trending_software(
  p_limit integer default 10,
  p_window_days integer default 7
)
returns table (
  software_id uuid,
  name text,
  slug text,
  logo_url text,
  total_events bigint,
  views bigint,
  downloads bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with recent as (
    select
      software_id,
      count(*)::bigint as total_events,
      count(*) filter (where event_type = 'view')::bigint as views,
      count(*) filter (where event_type = 'download')::bigint as downloads
    from public.analytics_events
    where created_at >= (now() - make_interval(days => greatest(p_window_days, 1)))
    group by software_id
  )
  select
    s.id as software_id,
    s.name,
    s.slug,
    s.media ->> 'logoUrl' as logo_url,
    coalesce(r.total_events, 0) as total_events,
    coalesce(r.views, 0) as views,
    coalesce(r.downloads, 0) as downloads
  from recent r
  join public.software s on s.id = r.software_id
  order by r.total_events desc, s.updated_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.analytics_totals()
returns table (
  total_views bigint,
  total_downloads bigint,
  total_software bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sum(coalesce((stats ->> 'views')::bigint, 0)) as total_views,
    sum(coalesce((stats ->> 'downloads')::bigint, 0)) as total_downloads,
    count(*)::bigint as total_software
  from public.software;
$$;
