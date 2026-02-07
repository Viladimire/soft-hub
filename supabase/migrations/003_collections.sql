--
-- Supabase Schema: Collections System
--

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  cover_image_url text,
  accent_color text,
  theme jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  software_id uuid not null references public.software(id) on delete cascade,
  "position" integer not null default 0,
  highlight text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection_id, software_id)
);

create index if not exists idx_collections_featured on public.collections (is_featured) where is_featured = true;
create index if not exists idx_collections_display_order on public.collections (display_order desc, created_at desc);
create index if not exists idx_collection_items_collection on public.collection_items (collection_id, "position");
create index if not exists idx_collection_items_software on public.collection_items (software_id);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

create or replace function public.collections_public(published_only boolean default true)
returns setof public.collections
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.collections
  where case when published_only then published_at is not null else true end
  order by display_order desc, created_at desc;
$$;

create or replace function public.collection_items_for(collection uuid)
returns table (
  collection_id uuid,
  software_id uuid,
  "position" integer,
  highlight text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ci.collection_id,
    ci.software_id,
    ci."position",
    ci.highlight,
    ci.created_at,
    ci.updated_at
  from public.collection_items ci
  where ci.collection_id = collection
  order by ci."position" asc, ci.created_at asc;
$$;

drop policy if exists "collections_public_read" on public.collections;
create policy "collections_public_read"
  on public.collections
  for select
  using (published_at is not null or public.is_admin() or public.is_service_role());

drop policy if exists "collections_admin_write" on public.collections;
create policy "collections_admin_write"
  on public.collections
  for all
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());

drop policy if exists "collection_items_public_read" on public.collection_items;
create policy "collection_items_public_read"
  on public.collection_items
  for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id
        and (c.published_at is not null or public.is_admin() or public.is_service_role())
    )
  );

drop policy if exists "collection_items_admin_write" on public.collection_items;
create policy "collection_items_admin_write"
  on public.collection_items
  for all
  to authenticated
  using (public.is_admin() or public.is_service_role())
  with check (public.is_admin() or public.is_service_role());
