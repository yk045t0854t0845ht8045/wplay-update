-- WPlay / Origin Web Admin: tabela de SteamIDs autorizadas (staff/admin)
-- Execute no SQL Editor do Supabase.
-- Recomendado: usar SUPABASE_SERVICE_ROLE_KEY no backend (site/.env).

begin;

create table if not exists public.admin_steam_ids (
  steam_id text primary key,
  staff_name text not null default 'Staff',
  staff_role text not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_steam_ids_steam_id_check check (steam_id ~ '^[0-9]{17}$')
);

create or replace function public.set_admin_steam_ids_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_steam_ids_updated_at on public.admin_steam_ids;
create trigger trg_admin_steam_ids_updated_at
before update on public.admin_steam_ids
for each row
execute function public.set_admin_steam_ids_updated_at();

alter table public.admin_steam_ids enable row level security;

-- Leitura publica (necessaria se backend usar ANON key para validar isAdmin)
drop policy if exists "admin_steam_ids_public_read" on public.admin_steam_ids;
create policy "admin_steam_ids_public_read"
on public.admin_steam_ids
for select
to anon, authenticated
using (true);

-- Opcao A (recomendada): backend usa SUPABASE_SERVICE_ROLE_KEY.
-- Neste caso, NAO crie policy aberta de escrita para anon.

-- Opcao B (menos segura): permitir escrita com ANON key.
-- Descomente somente se realmente precisar escrever com SUPABASE_ANON_KEY.
-- drop policy if exists "admin_steam_ids_public_write" on public.admin_steam_ids;
-- create policy "admin_steam_ids_public_write"
-- on public.admin_steam_ids
-- for all
-- to anon, authenticated
-- using (true)
-- with check (true);

-- Seed inicial (troque/adicione seus IDs reais)
insert into public.admin_steam_ids (steam_id, staff_name, staff_role)
values
  ('76561199481226329', 'Owner', 'super-admin')
on conflict (steam_id) do update
set
  staff_name = excluded.staff_name,
  staff_role = excluded.staff_role,
  updated_at = now();

commit;
