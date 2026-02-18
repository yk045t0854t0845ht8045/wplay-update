-- WPlay: atividade social entre amigos Steam (evento de "iniciou jogo")
-- Execute no SQL Editor do Supabase.

begin;

create extension if not exists pgcrypto;

create table if not exists public.launcher_friend_game_activity (
  id uuid primary key default gen_random_uuid(),
  actor_steam_id text not null,
  actor_display_name text not null default 'Jogador',
  actor_avatar_url text not null default '',
  game_id text not null default '',
  game_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists launcher_friend_game_activity_actor_created_idx
  on public.launcher_friend_game_activity (actor_steam_id, created_at desc);

create index if not exists launcher_friend_game_activity_created_idx
  on public.launcher_friend_game_activity (created_at desc);

alter table public.launcher_friend_game_activity enable row level security;

drop policy if exists "launcher_friend_game_activity_read_write" on public.launcher_friend_game_activity;
create policy "launcher_friend_game_activity_read_write"
on public.launcher_friend_game_activity
for all
to anon, authenticated
using (true)
with check (true);

commit;
