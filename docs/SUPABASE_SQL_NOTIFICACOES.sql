-- WPlay: notificacoes persistidas no Supabase (maximo de 15 por usuario, controlado pelo launcher)
-- Execute no SQL Editor do Supabase.

begin;

create extension if not exists pgcrypto;

create table if not exists public.launcher_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null default 'info',
  title text not null,
  message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists launcher_notifications_user_created_idx
  on public.launcher_notifications (user_id, created_at desc);

alter table public.launcher_notifications enable row level security;

drop policy if exists "launcher_notifications_read_write" on public.launcher_notifications;
create policy "launcher_notifications_read_write"
on public.launcher_notifications
for all
to anon, authenticated
using (true)
with check (true);

commit;

