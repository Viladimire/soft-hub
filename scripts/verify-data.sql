select
  (select count(*) from public.software) as software_count,
  (select count(*) from public.games) as games_count,
  (select count(*) from public.operating_systems) as operating_systems_count,
  (select count(*) from public.multimedia) as multimedia_count,
  (select count(*) from public.utilities) as utilities_count,
  (select count(*) from public.films) as films_count;

select slug, count(*)
from public.software
group by slug
having count(*) > 1;

select id, slug
from public.software
where slug is null or slug = '';

select id, slug
from public.software
where name is null or name = '';

select id, slug
from public.software
where description is null or length(description) < 200;

select id, slug, download_url
from public.software
where download_url is null
  or download_url = ''
  or download_url not like 'http%';

select id, slug, website_url
from public.software
where website_url is not null
  and website_url <> ''
  and website_url not like 'http%';

select id, slug
from public.software
where media is null
   or jsonb_typeof(media) <> 'object'
   or coalesce(media->>'logoUrl', '') = '';

select id, slug
from public.software
where media is not null
  and jsonb_typeof(media) = 'object'
  and media ? 'gallery'
  and jsonb_typeof(media->'gallery') <> 'array';

select id, slug
from public.software
where stats is null
   or jsonb_typeof(stats) <> 'object';
