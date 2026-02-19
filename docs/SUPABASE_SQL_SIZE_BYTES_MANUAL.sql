-- WPlay: migracao para tamanho manual em size_bytes (ex.: "1.6 GB", "850 MB")
-- Objetivo:
-- 1) Garantir coluna size_bytes
-- 2) Permitir texto manual no mesmo campo
-- 3) Manter compatibilidade com dados antigos

begin;

alter table public.launcher_games
  add column if not exists size_bytes text not null default '';

do $$
declare
  v_data_type text;
begin
  select c.data_type
    into v_data_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'launcher_games'
    and c.column_name = 'size_bytes'
  limit 1;

  if v_data_type is distinct from 'text' then
    alter table public.launcher_games
      alter column size_bytes type text
      using coalesce(size_bytes::text, '');
  end if;
end;
$$;

-- Copia tamanho antigo de size_label para size_bytes quando size_bytes ainda estiver vazio.
update public.launcher_games
set size_bytes = trim(size_label)
where coalesce(trim(size_bytes), '') = ''
  and coalesce(trim(size_label), '') <> '';

commit;

-- Exemplo de uso manual por jogo:
-- update public.launcher_games set size_bytes = '1.6 GB' where id = 'repo';
-- update public.launcher_games set size_bytes = '850 MB' where id = 'fast-food-simulator';

