--
-- Supabase Schema: Analytics - Countries Aggregation
--

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create or replace function public.analytics_top_countries(
  p_limit integer default 12,
  p_window_days integer default 30
)
returns table (
  country text,
  total_events bigint,
  views bigint,
  downloads bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (e.metadata ->> 'country') as country,
    count(*)::bigint as total_events,
    count(*) filter (where e.event_type = 'view')::bigint as views,
    count(*) filter (where e.event_type = 'download')::bigint as downloads
  from public.analytics_events e
  where e.created_at >= (now() - make_interval(days => greatest(p_window_days, 1)))
    and coalesce(e.metadata ->> 'country', '') <> ''
  group by (e.metadata ->> 'country')
  order by total_events desc, views desc, downloads desc
  limit greatest(p_limit, 1);
$$;
