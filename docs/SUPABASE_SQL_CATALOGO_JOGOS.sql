-- WPlay catalogo em tempo real (Supabase)
-- Execute tudo no SQL Editor do Supabase.

begin;

create table if not exists public.launcher_games (
  id text primary key,
  name text not null,
  section text not null default 'Catalogo',
  description text not null default 'Sem descricao.',
  long_description text not null default 'Sem descricao.',
  archive_type text not null default 'zip',
  archive_password text not null default '',
  checksum_sha256 text not null default '',
  download_url text not null default '',
  download_urls jsonb not null default '[]'::jsonb,
  download_sources jsonb not null default '[]'::jsonb,
  google_drive_file_id text not null default '',
  local_archive_file text not null default '',
  google_api_key text not null default '',
  install_dir_name text not null default '',
  launch_executable text not null default 'game.exe',
  auto_detect_executable boolean not null default true,
  image_url text not null default '',
  card_image_url text not null default '',
  banner_url text not null default '',
  logo_url text not null default '',
  developed_by text not null default '',
  published_by text not null default '',
  release_date text not null default '',
  trailer_url text not null default '',
  gallery jsonb not null default '[]'::jsonb,
  genres jsonb not null default '[]'::jsonb,
  average_play_time text not null default '',
  average_achievement text not null default '',
  size_bytes bigint not null default 0,
  size_label text not null default '',
  store_type text not null default '',
  store_tag text not null default '',
  current_price text not null default '',
  original_price text not null default '',
  discount_percent text not null default '',
  free boolean not null default false,
  exclusive boolean not null default false,
  coming_soon boolean not null default false,
  enabled boolean not null default true,
  sort_order integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists launcher_games_enabled_sort_idx
  on public.launcher_games (enabled, sort_order, updated_at desc);

create or replace function public.set_updated_at_launcher_games()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_launcher_games_updated_at on public.launcher_games;
create trigger trg_launcher_games_updated_at
before update on public.launcher_games
for each row
execute function public.set_updated_at_launcher_games();

alter table public.launcher_games enable row level security;

drop policy if exists "launcher_games_public_read" on public.launcher_games;
create policy "launcher_games_public_read"
on public.launcher_games
for select
to anon, authenticated
using (enabled = true);

-- Jogo REPO (UPSERT)
insert into public.launcher_games (
  id,
  name,
  section,
  description,
  long_description,
  archive_type,
  archive_password,
  checksum_sha256,
  download_url,
  download_urls,
  download_sources,
  install_dir_name,
  launch_executable,
  image_url,
  card_image_url,
  banner_url,
  logo_url,
  developed_by,
  published_by,
  release_date,
  trailer_url,
  gallery,
  genres,
  average_play_time,
  average_achievement,
  size_bytes,
  free,
  exclusive,
  coming_soon,
  enabled,
  sort_order
) values (
  'repo',
  'R.E.P.O.',
  'Catalogo',
  'An online co-op horror game with up to 6 players. Locate valuable objects and extract with your squad.',
  'Team up with up to six players in a tense online co-op horror experience. Explore dangerous facilities, recover valuable objects, and extract while everything reacts with full physics.',
  'rar',
  'online-fix.me',
  'c09b27ed29370ea971e6c1e03bca7dc1ff59f73d391c11dd8f0ff8cbb9fd850e',
  'https://github.com/yk045t0854t0845ht8045/wplay-assets/releases/download/repo-v0.3.2/REPO.v0.3.2-OFME.rar',
  '[]'::jsonb,
  '[
    {
      "url": "https://github.com/yk045t0854t0845ht8045/wplay-assets/releases/download/repo-v0.3.2/REPO.v0.3.2-OFME.rar",
      "label": "github-release",
      "kind": "github",
      "priority": 10
    }
  ]'::jsonb,
  'REPO',
  E'REPO\\REPO.EXE',
  'https://imgur.com/CkC4BWy.png',
  'https://imgur.com/CkC4BWy.png',
  'https://imgur.com/CkC4BWy.png',
  'https://imgur.com/BLXTkyr.png',
  'semiwork',
  'semiwork',
  '26 Feb 2025',
  'https://www.youtube.com/watch?v=oSfoK8eSeD8',
  '[
    "https://imgur.com/CkC4BWy.png",
    "https://imgur.com/3XnsrX0.png",
    "https://imgur.com/vwa15yb.png"
  ]'::jsonb,
  '["Horror","Co-op","Action","Survival"]'::jsonb,
  '16hs',
  '27%',
  951972810,
  false,
  false,
  false,
  true,
  10
)
on conflict (id) do update
set
  name = excluded.name,
  section = excluded.section,
  description = excluded.description,
  long_description = excluded.long_description,
  archive_type = excluded.archive_type,
  archive_password = excluded.archive_password,
  checksum_sha256 = excluded.checksum_sha256,
  download_url = excluded.download_url,
  download_urls = excluded.download_urls,
  download_sources = excluded.download_sources,
  install_dir_name = excluded.install_dir_name,
  launch_executable = excluded.launch_executable,
  image_url = excluded.image_url,
  card_image_url = excluded.card_image_url,
  banner_url = excluded.banner_url,
  logo_url = excluded.logo_url,
  developed_by = excluded.developed_by,
  published_by = excluded.published_by,
  release_date = excluded.release_date,
  trailer_url = excluded.trailer_url,
  gallery = excluded.gallery,
  genres = excluded.genres,
  average_play_time = excluded.average_play_time,
  average_achievement = excluded.average_achievement,
  size_bytes = excluded.size_bytes,
  free = excluded.free,
  exclusive = excluded.exclusive,
  coming_soon = excluded.coming_soon,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;

commit;
