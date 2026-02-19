-- WPlay: sincronizacao automatica de preco via Steam App ID
-- Objetivo: ao inserir/atualizar steam_app_id em public.launcher_games,
-- atualizar automaticamente original_price (e tambem current_price/discount_percent/free).
-- Regra de exibicao:
-- - current_price fica sempre "Gratuito"
-- - original_price recebe apenas numero (ex: 10.99), sem moeda/simbolo
--
-- Como usar:
-- 1) Execute este arquivo no SQL Editor do Supabase.
-- 2) Ao fazer INSERT/UPDATE com steam_app_id > 0, o trigger atualiza os precos.
-- 3) Para jogos ja existentes, rode:
--    select public.sync_all_launcher_game_prices_from_steam('br', 'brazilian');

begin;

create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

create or replace function public.extract_steam_app_id(p_input text)
returns bigint
language plpgsql
immutable
as $$
declare
  v_id_text text;
begin
  if p_input is null then
    return null;
  end if;

  -- Se veio apenas o numero
  if p_input ~ '^\s*\d+\s*$' then
    return trim(p_input)::bigint;
  end if;

  -- URL padrao Steam: /app/<id>/
  v_id_text := substring(p_input from '/app/([0-9]+)');
  if v_id_text is null or v_id_text = '' then
    return null;
  end if;

  return v_id_text::bigint;
exception
  when others then
    return null;
end;
$$;

create or replace function public.sync_launcher_game_price_from_steam(
  p_game_id text,
  p_cc text default 'br',
  p_lang text default 'brazilian'
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_steam_app_id bigint;
  v_url text;
  v_response record;
  v_payload jsonb;
  v_app_payload jsonb;
  v_data jsonb;
  v_price_overview jsonb;
  v_is_free boolean := false;
  v_initial_cents numeric;
  v_final_cents numeric;
  v_current_price text := 'Gratuito';
  v_original_price text;
  v_discount_percent text;
  v_discount_raw integer := 0;
  v_cc text;
  v_lang text;
begin
  if p_game_id is null or btrim(p_game_id) = '' then
    return false;
  end if;

  select g.steam_app_id
    into v_steam_app_id
  from public.launcher_games g
  where g.id = p_game_id;

  if not found or v_steam_app_id is null or v_steam_app_id <= 0 then
    return false;
  end if;

  -- Sanitiza parametros para URL
  v_cc := lower(regexp_replace(coalesce(p_cc, ''), '[^a-z]', '', 'g'));
  if v_cc = '' then
    v_cc := 'br';
  end if;

  v_lang := lower(regexp_replace(coalesce(p_lang, ''), '[^a-z_-]', '', 'g'));
  if v_lang = '' then
    v_lang := 'brazilian';
  end if;

  v_url := format(
    'https://store.steampowered.com/api/appdetails?appids=%s&cc=%s&l=%s',
    v_steam_app_id,
    v_cc,
    v_lang
  );

  select *
    into v_response
  from extensions.http_get(v_url);

  if coalesce(v_response.status, 0) <> 200 then
    raise warning 'Steam API retornou status % para game_id=% (steam_app_id=%)',
      v_response.status, p_game_id, v_steam_app_id;
    return false;
  end if;

  begin
    v_payload := v_response.content::jsonb;
  exception
    when others then
      raise warning 'Resposta JSON invalida da Steam para game_id=% (steam_app_id=%)',
        p_game_id, v_steam_app_id;
      return false;
  end;

  v_app_payload := v_payload -> (v_steam_app_id::text);
  if v_app_payload is null then
    return false;
  end if;

  if coalesce((v_app_payload ->> 'success')::boolean, false) = false then
    raise warning 'Steam appdetails success=false para game_id=% (steam_app_id=%)',
      p_game_id, v_steam_app_id;
    return false;
  end if;

  v_data := v_app_payload -> 'data';
  if v_data is null then
    return false;
  end if;

  v_is_free := coalesce((v_data ->> 'is_free')::boolean, false);
  v_price_overview := v_data -> 'price_overview';

  if v_is_free then
    v_original_price := '0.00';
    v_discount_percent := '0%';
  else
    if v_price_overview is null then
      raise warning 'Steam sem price_overview para game_id=% (steam_app_id=%)',
        p_game_id, v_steam_app_id;
      return false;
    end if;

    v_final_cents := nullif(v_price_overview ->> 'final', '')::numeric;
    v_initial_cents := nullif(v_price_overview ->> 'initial', '')::numeric;
    v_discount_raw := coalesce(nullif(v_price_overview ->> 'discount_percent', '')::integer, 0);

    -- original_price usa o valor "cheio" (initial). Se vier nulo, cai para final.
    if v_initial_cents is not null then
      v_original_price := trim(to_char(v_initial_cents / 100.0, 'FM999999990.00'));
    elsif v_final_cents is not null then
      v_original_price := trim(to_char(v_final_cents / 100.0, 'FM999999990.00'));
    end if;

    if v_original_price is null then
      raise warning 'Nao foi possivel extrair original_price numerico da Steam para game_id=% (steam_app_id=%)',
        p_game_id, v_steam_app_id;
      return false;
    end if;

    if v_discount_raw < 0 then
      v_discount_raw := 0;
    end if;
    v_discount_percent := v_discount_raw::text || '%';
  end if;

  update public.launcher_games g
  set
    current_price = v_current_price,
    original_price = coalesce(v_original_price, g.original_price),
    discount_percent = coalesce(v_discount_percent, g.discount_percent),
    free = v_is_free
  where g.id = p_game_id;

  return true;
exception
  when others then
    raise warning 'Falha ao sincronizar preco Steam para game_id=%: %', p_game_id, sqlerrm;
    return false;
end;
$$;

create or replace function public.trg_sync_launcher_game_price_from_steam()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.steam_app_id is null or new.steam_app_id <= 0 then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.steam_app_id is not distinct from old.steam_app_id then
    return new;
  end if;

  perform public.sync_launcher_game_price_from_steam(new.id);
  return new;
exception
  when others then
    raise warning 'Trigger Steam price falhou para id=%: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists trg_launcher_games_sync_steam_price on public.launcher_games;
create trigger trg_launcher_games_sync_steam_price
after insert or update of steam_app_id on public.launcher_games
for each row
execute function public.trg_sync_launcher_game_price_from_steam();

create or replace function public.sync_all_launcher_game_prices_from_steam(
  p_cc text default 'br',
  p_lang text default 'brazilian'
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select g.id
    from public.launcher_games g
    where g.steam_app_id > 0
  loop
    if public.sync_launcher_game_price_from_steam(v_row.id, p_cc, p_lang) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

do $$
declare
  v_job_id bigint;
begin
  -- Remove job anterior para evitar duplicidade quando o script for executado novamente.
  select j.jobid
    into v_job_id
  from cron.job j
  where j.jobname = 'wplay_sync_steam_prices_daily'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  -- Executa 1x por dia (24h) as 06:00 UTC (~03:00 no horario de Brasilia sem horario de verao).
  perform cron.schedule(
    'wplay_sync_steam_prices_daily',
    '0 6 * * *',
    $cron$select public.sync_all_launcher_game_prices_from_steam('br', 'brazilian');$cron$
  );
end;
$$;

commit;

-- Exemplos de uso:
-- 0) Extrair app_id direto da URL:
-- select public.extract_steam_app_id('https://store.steampowered.com/app/3241660/REPO/');
--
-- 1) Atualizar um jogo especifico (ex: REPO):
-- select public.sync_launcher_game_price_from_steam('repo', 'br', 'brazilian');
--
-- 2) Atualizar todos os jogos com steam_app_id:
-- select public.sync_all_launcher_game_prices_from_steam('br', 'brazilian');
--
-- 3) Verificar job agendado (24h):
-- select jobid, jobname, schedule, active from cron.job where jobname = 'wplay_sync_steam_prices_daily';
