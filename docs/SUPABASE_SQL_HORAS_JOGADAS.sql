-- WPlay: horas jogadas por usuario/jogo (persistente, monotono, sem perder historico)
-- Execute no SQL Editor do Supabase.

begin;

create extension if not exists pgcrypto;

create table if not exists public.launcher_game_playtime (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  game_id text not null,
  game_name text not null default '',
  total_seconds bigint not null default 0,
  first_played_at timestamptz,
  last_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint launcher_game_playtime_user_game_unique unique (user_id, game_id),
  constraint launcher_game_playtime_total_seconds_non_negative check (total_seconds >= 0)
);

create index if not exists launcher_game_playtime_user_updated_idx
  on public.launcher_game_playtime (user_id, updated_at desc);

create index if not exists launcher_game_playtime_user_last_played_idx
  on public.launcher_game_playtime (user_id, last_played_at desc);

create or replace function public.set_updated_at_launcher_game_playtime()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_launcher_game_playtime_updated_at on public.launcher_game_playtime;
create trigger trg_launcher_game_playtime_updated_at
before update on public.launcher_game_playtime
for each row
execute function public.set_updated_at_launcher_game_playtime();

-- Upsert monotono: nunca reduz total_seconds (usa GREATEST no conflito).
create or replace function public.bump_launcher_game_playtime(
  p_user_id text,
  p_game_id text,
  p_game_name text default '',
  p_total_seconds bigint default 0,
  p_last_played_at timestamptz default now()
)
returns void
language plpgsql
as $$
declare
  v_user_id text := trim(coalesce(p_user_id, ''));
  v_game_id text := trim(coalesce(p_game_id, ''));
  v_game_name text := trim(coalesce(p_game_name, ''));
  v_total_seconds bigint := greatest(coalesce(p_total_seconds, 0), 0);
  v_last_played_at timestamptz := coalesce(p_last_played_at, now());
begin
  if v_user_id = '' then
    raise exception '[PLAYTIME_USER_REQUIRED] user_id vazio.';
  end if;
  if v_game_id = '' then
    raise exception '[PLAYTIME_GAME_REQUIRED] game_id vazio.';
  end if;

  insert into public.launcher_game_playtime (
    user_id,
    game_id,
    game_name,
    total_seconds,
    first_played_at,
    last_played_at
  )
  values (
    v_user_id,
    v_game_id,
    v_game_name,
    v_total_seconds,
    v_last_played_at,
    v_last_played_at
  )
  on conflict (user_id, game_id) do update
  set
    game_name = case
      when trim(coalesce(excluded.game_name, '')) <> '' then excluded.game_name
      else launcher_game_playtime.game_name
    end,
    total_seconds = greatest(launcher_game_playtime.total_seconds, excluded.total_seconds),
    first_played_at = coalesce(launcher_game_playtime.first_played_at, excluded.first_played_at, now()),
    last_played_at = greatest(
      coalesce(launcher_game_playtime.last_played_at, to_timestamp(0)),
      coalesce(excluded.last_played_at, to_timestamp(0))
    );
end;
$$;

grant execute on function public.bump_launcher_game_playtime(text, text, text, bigint, timestamptz)
  to anon, authenticated;

alter table public.launcher_game_playtime enable row level security;

drop policy if exists "launcher_game_playtime_read_write" on public.launcher_game_playtime;
create policy "launcher_game_playtime_read_write"
on public.launcher_game_playtime
for all
to anon, authenticated
using (true)
with check (true);

commit;
