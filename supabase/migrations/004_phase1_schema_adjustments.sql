--
-- Supabase Schema Adjustments: Phase 1 (Foundation & Data)
-- This migration refines core tables with defaults, indexes, and triggers
-- to support large-scale data import and consistent metadata updates.
--

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Helper function to keep updated_at columns in sync
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ensure jsonb defaults carry expected structure
-- ---------------------------------------------------------------------------
alter table public.software
  alter column stats set default jsonb_build_object('views', 0, 'downloads', 0),
  alter column media set default jsonb_build_object('logoUrl', null, 'heroImage', null, 'gallery', '[]'::jsonb),
  alter column developer set default jsonb_build_object('name', null, 'website', null, 'contact', null),
  alter column requirements set default jsonb_build_object('minimum', '[]'::jsonb, 'recommended', '[]'::jsonb);

update public.software
set stats = coalesce(stats, '{}'::jsonb)
      || jsonb_build_object('views', coalesce((stats ->> 'views')::bigint, 0))
      || jsonb_build_object('downloads', coalesce((stats ->> 'downloads')::bigint, 0)),
    media = coalesce(media, '{}'::jsonb)
      || jsonb_build_object('logoUrl', media ->> 'logoUrl')
      || jsonb_build_object('heroImage', media ->> 'heroImage')
      || jsonb_build_object('gallery', coalesce(media -> 'gallery', '[]'::jsonb)),
    developer = coalesce(developer, '{}'::jsonb)
      || jsonb_build_object('name', developer ->> 'name')
      || jsonb_build_object('website', developer ->> 'website')
      || jsonb_build_object('contact', developer ->> 'contact'),
    requirements = coalesce(requirements, '{}'::jsonb)
      || jsonb_build_object('minimum', coalesce(requirements -> 'minimum', '[]'::jsonb))
      || jsonb_build_object('recommended', coalesce(requirements -> 'recommended', '[]'::jsonb));

-- ---------------------------------------------------------------------------
-- Additional indexes to assist Phase 1 data exploration and filtering
-- ---------------------------------------------------------------------------
create index if not exists idx_software_type on public.software (type);
create index if not exists idx_software_is_trending on public.software (is_trending) where is_trending = true;
create index if not exists idx_software_release_date on public.software (release_date desc nulls last);

create index if not exists idx_games_is_free on public.games (is_free);
create index if not exists idx_games_is_open_source on public.games (is_open_source);

create index if not exists idx_operating_systems_support_status on public.operating_systems (support_status);
create index if not exists idx_operating_systems_architectures on public.operating_systems using gin (architectures);

create index if not exists idx_multimedia_media_types on public.multimedia using gin (media_types);
create index if not exists idx_multimedia_codecs on public.multimedia using gin (codecs_supported);

create index if not exists idx_utilities_type on public.utilities (utility_type);

create index if not exists idx_collections_published_at on public.collections (published_at desc nulls last);
create index if not exists idx_collection_items_position on public.collection_items (collection_id, "position" desc);

create index if not exists idx_analytics_events_created on public.analytics_events (created_at desc);
create index if not exists idx_analytics_events_type on public.analytics_events (event_type);

-- ---------------------------------------------------------------------------
-- Updated_at triggers to keep metadata fresh
-- ---------------------------------------------------------------------------
create trigger trg_software_touch_updated_at
  before update on public.software
  for each row
  execute function public.touch_updated_at();

create trigger trg_games_touch_updated_at
  before update on public.games
  for each row
  execute function public.touch_updated_at();

create trigger trg_operating_systems_touch_updated_at
  before update on public.operating_systems
  for each row
  execute function public.touch_updated_at();

create trigger trg_multimedia_touch_updated_at
  before update on public.multimedia
  for each row
  execute function public.touch_updated_at();

create trigger trg_utilities_touch_updated_at
  before update on public.utilities
  for each row
  execute function public.touch_updated_at();

create trigger trg_collections_touch_updated_at
  before update on public.collections
  for each row
  execute function public.touch_updated_at();

create trigger trg_collection_items_touch_updated_at
  before update on public.collection_items
  for each row
  execute function public.touch_updated_at();

create trigger trg_films_touch_updated_at
  before update on public.films
  for each row
  execute function public.touch_updated_at();

create trigger trg_analytics_events_touch_updated_at
  before update on public.analytics_events
  for each row
  execute function public.touch_updated_at();

create trigger trg_analytics_search_events_touch_updated_at
  before update on public.analytics_search_events
  for each row
  execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Consistency helpers for collections
-- ---------------------------------------------------------------------------
create or replace function public.collections_with_counts()
returns table (
  id uuid,
  slug text,
  title text,
  subtitle text,
  description text,
  is_featured boolean,
  display_order integer,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  items_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.slug,
    c.title,
    c.subtitle,
    c.description,
    c.is_featured,
    c.display_order,
    c.published_at,
    c.created_at,
    c.updated_at,
    count(ci.software_id)::bigint as items_count
  from public.collections c
  left join public.collection_items ci on ci.collection_id = c.id
  group by c.id
  order by c.display_order desc, c.created_at desc;
$$;

grant execute on function public.collections_with_counts() to anon, authenticated;
