-- WPlay / Origin: cargos de staff dentro de public.launcher_runtime_flags.data
-- Linha de controle usada: id = 'maintenance_mode'
--
-- Estrutura usada no JSON:
-- data.staffProfiles.<steam_id> = {
--   "nickname": "Nome",
--   "role": "developer|administrador|staff",
--   "tag": "STAFF AUTORIZADO",
--   "permissions": ["*"] // opcional
-- }

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

-- 1) UPSERT principal: deixa seu usuario como developer (DEV)
insert into public.launcher_runtime_flags (
  id,
  enabled,
  title,
  message,
  data
) values (
  'maintenance_mode',
  true,
  'Manutencao Programada:',
  'Estamos adicionando mais jogos ao Origin, pode ocorrer instabilidades.',
  jsonb_build_object(
    'staffProfiles',
    jsonb_build_object(
      '76561199481226329',
      jsonb_build_object(
        'nickname', 'drk SKINS',
        'role', 'developer',
        'tag', 'STAFF AUTORIZADO',
        'permissions', jsonb_build_array('*')
      )
    )
  )
)
on conflict (id) do update
set
  enabled = excluded.enabled,
  title = excluded.title,
  message = excluded.message,
  data = coalesce(public.launcher_runtime_flags.data, '{}'::jsonb) || excluded.data,
  updated_at = now();

commit;

-- 2) EDITAR/CRIAR cargo de um funcionario (troque STEAM_ID e valores)
-- update public.launcher_runtime_flags
-- set
--   data = jsonb_set(
--     coalesce(data, '{}'::jsonb),
--     '{staffProfiles,STEAM_ID}',
--     jsonb_build_object(
--       'nickname', 'Nome do funcionario',
--       'role', 'administrador', -- developer | administrador | staff
--       'tag', 'STAFF AUTORIZADO',
--       'permissions', jsonb_build_array('*')
--     ),
--     true
--   ),
--   updated_at = now()
-- where id = 'maintenance_mode';

-- 3) REMOVER cargo de um funcionario (troque STEAM_ID)
-- update public.launcher_runtime_flags
-- set
--   data = coalesce(data, '{}'::jsonb) #- '{staffProfiles,STEAM_ID}',
--   updated_at = now()
-- where id = 'maintenance_mode';
