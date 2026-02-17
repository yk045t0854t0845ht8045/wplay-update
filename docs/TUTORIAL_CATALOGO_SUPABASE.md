# Tutorial Catalogo Supabase (Tempo Real)

Este launcher agora consegue puxar jogos direto do Supabase em tempo real.

## 1) Executar SQL no Supabase

No SQL Editor do Supabase, execute:

- `docs/SUPABASE_SQL_CATALOGO_JOGOS.sql`

Esse SQL:

1. cria tabela `public.launcher_games`
2. cria trigger de `updated_at`
3. cria policy de leitura para `anon/authenticated`
4. insere (ou atualiza) o jogo `repo`

## 2) Confirmar auth do launcher

Arquivo: `config/auth.json`

```json
{
  "supabaseUrl": "https://SEU-PROJETO.supabase.co",
  "supabaseAnonKey": "SUA_SUPABASE_ANON_KEY",
  "redirectUrl": "wplay://auth/callback"
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
  id, name, section, archive_type, download_url, download_sources,
  install_dir_name, launch_executable, enabled, sort_order
)
values (
  'meu-jogo',
  'Meu Jogo',
  'Catalogo',
  'zip',
  'https://github.com/SEU_USUARIO/wplay-assets/releases/download/meu-jogo-v1/meu-jogo.zip',
  '[{"url":"https://github.com/SEU_USUARIO/wplay-assets/releases/download/meu-jogo-v1/meu-jogo.zip","label":"github-release","kind":"github","priority":10}]'::jsonb,
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
  install_dir_name = excluded.install_dir_name,
  launch_executable = excluded.launch_executable,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;
```

Em ate ~5 segundos, o jogo aparece no launcher sem atualizar build.

## 6) Teste pronto: REPO 2 (Google Drive)

Para inserir/atualizar um jogo de teste `REPO 2` usando link `drive.usercontent`, execute:

- `docs/SUPABASE_SQL_REPO2_TESTE.sql`

Esse SQL ja sobe `download_sources` com prioridade para o link direto e fallbacks.
