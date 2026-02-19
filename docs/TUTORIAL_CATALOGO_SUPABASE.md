# Tutorial Catalogo Supabase (Tempo Real)

Este launcher agora consegue puxar jogos direto do Supabase em tempo real.

## 1) Executar SQL no Supabase

No SQL Editor do Supabase, execute:

- `docs/SUPABASE_SQL_CATALOGO_JOGOS.sql`
- `docs/SUPABASE_SQL_STEAM_PRECO_AUTO.sql` (opcional, recomendado)

Esse SQL:

1. cria tabela `public.launcher_games`
2. cria trigger de `updated_at`
3. cria policy de leitura para `anon/authenticated`
4. insere (ou atualiza) o jogo `repo` (Drive-only)

O SQL opcional de preco Steam:

1. habilita `extensions.http`
2. habilita `pg_cron`
3. cria funcao para consultar `store.steampowered.com/api/appdetails`
4. atualiza `original_price` como numero (`10.99`) e mantem `current_price` fixo como `Gratuito`
5. cria trigger para sincronizar automaticamente no `INSERT/UPDATE` de `steam_app_id`
6. agenda sincronizacao automatica a cada 24h (`06:00 UTC`) para capturar promocoes e mudancas de preco

## 2) Confirmar auth do launcher

Arquivo: `config/auth.json`

```json
{
  "supabaseUrl": "https://SEU-PROJETO.supabase.co",
  "supabaseAnonKey": "SUA_SUPABASE_ANON_KEY",
  "redirectUrl": "wplay://auth/callback",
  "steamWebApiKey": "SUA_STEAM_WEB_API_KEY"
}
```

## 3) Confirmar catalogo remoto

Arquivo: `config/games.json` (settings)

```json
"catalog": {
  "provider": "supabase",
  "enabled": true,
  "supabaseSchema": "public",
  "supabaseTable": "launcher_games",
  "pollIntervalSeconds": 5,
  "fallbackToLocalJson": true,
  "allowEmptyRemote": false
}
```

## 4) Como funciona o tempo real

- O frontend faz refresh periodico a cada `5s`.
- O main process consulta o Supabase e usa cache curto.
- Se Supabase falhar, usa fallback do `games.json`.

## 5) Adicionar novo jogo no Supabase

Exemplo rapido:

```sql
insert into public.launcher_games (
  id, name, section, archive_type, download_url, download_sources, google_drive_file_id,
  install_dir_name, launch_executable, enabled, sort_order
)
values (
  'meu-jogo',
  'Meu Jogo',
  'Catalogo',
  'zip',
  'https://drive.usercontent.google.com/download?id=ID_DO_ARQUIVO&export=download&authuser=0',
  '[
    {"url":"https://drive.usercontent.google.com/download?id=ID_DO_ARQUIVO&export=download&authuser=0","label":"driveusercontent","kind":"google-drive","priority":5},
    {"url":"https://drive.google.com/uc?export=download&id=ID_DO_ARQUIVO","label":"drive-uc-fallback","kind":"google-drive","priority":8}
  ]'::jsonb,
  'ID_DO_ARQUIVO',
  'MEU_JOGO',
  E'MEU_JOGO\\JOGO.EXE',
  true,
  50
)
on conflict (id) do update
set
  name = excluded.name,
  download_url = excluded.download_url,
  download_sources = excluded.download_sources,
  google_drive_file_id = excluded.google_drive_file_id,
  install_dir_name = excluded.install_dir_name,
  launch_executable = excluded.launch_executable,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;
```

Em ate ~5 segundos, o jogo aparece no launcher sem atualizar build.

Se voce ativou o SQL de preco Steam, tambem pode forcar a atualizacao dos precos ja cadastrados:

```sql
select public.sync_all_launcher_game_prices_from_steam('br', 'brazilian');
```

Tambem pode extrair o App ID direto da URL da Steam:

```sql
select public.extract_steam_app_id('https://store.steampowered.com/app/3241660/REPO/');
```

Para conferir o agendamento diario:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'wplay_sync_steam_prices_daily';
```

## 6) Upsert pronto: REPO oficial (Google Drive)

Para inserir/atualizar o `REPO` oficial usando link `drive.usercontent`, execute:

- `docs/SUPABASE_SQL_REPO2_TESTE.sql`

Esse SQL remove `repo2` antigo (se existir) e sobe o `repo` oficial com `download_sources` priorizando Drive + fallbacks.

## 7) Sem atualizar launcher a cada mudanca

Com `catalog.provider = "supabase"` e `pollIntervalSeconds = 5` no `config/games.json`, qualquer alteracao no banco (nome, descricao, links, preco, ordem etc.) aparece no launcher em segundos, sem gerar novo build do app.
