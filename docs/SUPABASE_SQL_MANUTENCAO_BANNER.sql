-- WPlay: banner de manutencao em tempo real (Supabase)
-- Objetivo:
-- - Controlar exibicao no launcher via enabled (false = oculto, true = visivel)
-- - Atualizar launcher aberto em tempo real (poll do app em poucos segundos)
--
-- Tabela usada pelo launcher:
--   public.launcher_runtime_flags
-- Linha usada por padrao:
--   id = 'maintenance_mode'

begin;

create table if not exists public.launcher_runtime_flags (
  id text primary key,
  enabled boolean not null default false,
  title text not null default 'Manutencao programada',
  message text not null default 'Pode haver instabilidades temporarias durante este periodo.',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_launcher_runtime_flags()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_launcher_runtime_flags_updated_at on public.launcher_runtime_flags;
create trigger trg_launcher_runtime_flags_updated_at
before update on public.launcher_runtime_flags
for each row
execute function public.set_updated_at_launcher_runtime_flags();

alter table public.launcher_runtime_flags enable row level security;

drop policy if exists "launcher_runtime_flags_public_read" on public.launcher_runtime_flags;
create policy "launcher_runtime_flags_public_read"
on public.launcher_runtime_flags
for select
to anon, authenticated
using (true);

-- INSERT/UPSERT principal (estado inicial = false)
insert into public.launcher_runtime_flags (
  id,
  enabled,
  title,
  message
) values (
  'maintenance_mode',
  false,
  'Manutencao programada',
  'Pode haver instabilidades temporarias durante este periodo.'
)
on conflict (id) do update
set
  enabled = excluded.enabled,
  title = excluded.title,
  message = excluded.message,
  updated_at = now();

commit;

-- Ligar manutencao (banner amarelo aparece no launcher):
-- update public.launcher_runtime_flags
-- set
--   enabled = true,
--   title = 'Manutencao programada',
--   message = 'Pode haver instabilidades temporarias durante este periodo.',
--   updated_at = now()
-- where id = 'maintenance_mode';
--
-- Desligar manutencao (banner sai com animacao para cima):
-- update public.launcher_runtime_flags
-- set
--   enabled = false,
--   updated_at = now()
-- where id = 'maintenance_mode';
