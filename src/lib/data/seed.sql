-- Seed data for the "software" table
-- Each entry covers diverse categories, platforms, and includes featured/trending programs.
-- Run via scripts/seed-supabase.mjs or paste into the Supabase SQL editor.

insert into public.software (
  slug,
  name,
  summary,
  description,
  version,
  size_in_bytes,
  platforms,
  categories,
  type,
  website_url,
  download_url,
  is_featured,
  release_date,
  updated_at,
  created_at,
  stats,
  media,
  requirements,
  changelog
) values
  (
    'nova-desk',
    'Nova Desk',
    'AI-powered productivity cockpit for cross-platform teams.',
    'Nova Desk unifies task orchestration, meeting insights, and AI copilots into a single desktop suite available on Windows, macOS, and Linux.',
    '3.4.1',
    512000000,
    array['windows','mac','linux'],
    array['productivity','utilities'],
    'freemium',
    'https://novadesk.app',
    'https://download.novadesk.app/latest',
    true,
    '2024-08-12T00:00:00Z',
    '2024-10-01T00:00:00Z',
    '2024-06-15T00:00:00Z',
    json_build_object('downloads', 182000, 'views', 420000, 'rating', 4.7, 'votes', 5600),
    json_build_object(
      'logoUrl', 'https://images.unsplash.com/photo-1551816230-ef5deaed4fb7?auto=format&fit=crop&w=120&q=80',
      'gallery', array[
        'https://images.unsplash.com/photo-1523476893152-5e0d7d17c1d2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80'
      ],
      'heroImage', 'https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=1600&q=80'
    ),
    json_build_object(
      'minimum', array['Intel i5', '8GB RAM', '2GB VRAM'],
      'recommended', array['Intel i7', '16GB RAM', 'SSD Storage']
    ),
    json_build_array(
      json_build_object('version','3.4.1','date','2024-10-01','highlights',array['AI copilots for meetings','Offline workspace sync']),
      json_build_object('version','3.3.0','date','2024-08-12','highlights',array['Cross-platform redesign','Workflow automation templates'])
    )
  ),
  (
    'blueprint-studio',
    'Blueprint Studio',
    'Generative UI/UX design suite with collaborative review.',
    'Blueprint Studio helps designers and product squads generate, prototype, and validate interfaces with AI-assisted flows and synchronized handoff to engineering.',
    '2.1.0',
    628000000,
    array['mac','windows'],
    array['design'],
    'freemium',
    'https://blueprint.studio',
    'https://cdn.blueprint.studio/mac/latest',
    true,
    '2024-05-30T00:00:00Z',
    '2024-09-18T00:00:00Z',
    '2024-01-12T00:00:00Z',
    json_build_object('downloads', 204000, 'views', 610000, 'rating', 4.8, 'votes', 7800),
    json_build_object(
      'logoUrl', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=120&q=80',
      'gallery', array[
        'https://images.unsplash.com/photo-1580894894513-541e068a055d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80'
      ]
    ),
    json_build_object(
      'minimum', array['Apple M1 / Intel i5', '8GB RAM'],
      'recommended', array['Apple M2', '16GB RAM', 'Metal-capable GPU']
    ),
    json_build_array(
      json_build_object('version','2.1.0','date','2024-09-18','highlights',array['Realtime voice notes','Figma sync 2.0']),
      json_build_object('version','2.0.0','date','2024-05-30','highlights',array['Generative templates','Design QA panel']))
  ),
  (
    'sentinel-core',
    'Sentinel Core',
    'Endpoint security hub with zero-trust orchestration.',
    'Sentinel Core monitors workloads across desktop fleets with behavioral AI, rapid threat isolation, and encrypted telemetry exports.',
    '5.2.3',
    450000000,
    array['windows','linux'],
    array['security'],
    'freemium',
    'https://sentinelcore.io',
    'https://download.sentinelcore.io/latest',
    true,
    '2024-04-09T00:00:00Z',
    '2024-07-22T00:00:00Z',
    '2023-12-30T00:00:00Z',
    json_build_object('downloads', 158000, 'views', 280000, 'rating', 4.6, 'votes', 5200),
    json_build_object(
      'logoUrl', 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=120&q=80',
      'gallery', array[
        'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80'
      ]
    ),
    json_build_object('minimum', array['Intel i3', '8GB RAM'], 'recommended', array['Intel i7', '16GB RAM'] ),
    json_build_array(json_build_object('version','5.2.3','date','2024-07-22','highlights',array['Playbook automation','Kernel telemetry dashboard'])))
;

-- Additional rows omitted for brevity. Refer to scripts/seed-supabase.mjs for the full dataset.
