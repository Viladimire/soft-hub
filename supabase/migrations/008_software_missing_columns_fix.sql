alter table public.software
  add column if not exists summary text;

alter table public.software
  add column if not exists size_in_bytes bigint;

alter table public.software
  add column if not exists platforms text[] not null default '{}';

alter table public.software
  add column if not exists categories text[] not null default '{}';

alter table public.software
  add column if not exists type text;

alter table public.software
  add column if not exists website_url text;

alter table public.software
  add column if not exists download_url text;

alter table public.software
  add column if not exists is_featured boolean not null default false;

alter table public.software
  add column if not exists is_trending boolean not null default false;

alter table public.software
  add column if not exists release_date date;
