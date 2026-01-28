alter table public.software
  add column if not exists developer jsonb not null default '{}'::jsonb;

alter table public.software
  add column if not exists features text[] not null default '{}';

alter table public.software
  add column if not exists stats jsonb not null default '{}'::jsonb;

alter table public.software
  add column if not exists media jsonb not null default '{}'::jsonb;

alter table public.software
  add column if not exists requirements jsonb;

alter table public.software
  add column if not exists changelog jsonb;
