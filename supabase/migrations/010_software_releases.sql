-- Software releases table ------------------------------------------------------
create table if not exists public.software_releases (
  id uuid primary key default gen_random_uuid(),
  software_id uuid not null references public.software(id) on delete cascade,
  version text not null,
  file_name text,
  additional_info text,
  download_url text not null,
  size_in_bytes bigint,
  release_date date,
  downloads_count bigint not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_software_releases_unique_version
  on public.software_releases (software_id, version);

create index if not exists idx_software_releases_software_id
  on public.software_releases (software_id);

create index if not exists idx_software_releases_release_date
  on public.software_releases (release_date desc nulls last, created_at desc);

alter table public.software_releases enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'software_releases'
      and policyname = 'software_releases_public_read'
  ) then
    create policy "software_releases_public_read"
      on public.software_releases
      for select
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'software_releases'
      and policyname = 'software_releases_admin_write'
  ) then
    create policy "software_releases_admin_write"
      on public.software_releases
      for all
      to authenticated
      using (public.is_admin() or public.is_service_role())
      with check (public.is_admin() or public.is_service_role());
  end if;
end
$$;
