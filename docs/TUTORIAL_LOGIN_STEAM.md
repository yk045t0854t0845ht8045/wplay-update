# Tutorial: Login com Steam + Stats por Jogo (WPlay)

Este guia configura:
- Login obrigatorio via Steam (OpenID).
- Preenchimento de `AVG. PLAY TIME` e `AVG. ACHIEV.` com dados reais do usuario logado.

## 1) Gerar Steam Web API Key

1. Entre na conta Steam que vai administrar o launcher.
2. Abra: `https://steamcommunity.com/dev/apikey`
3. Em `Domain Name`, use `localhost` (ou seu dominio).
4. Copie a chave gerada.

## 2) Configurar `config/auth.json`

```json
{
  "supabaseUrl": "https://SEU-PROJETO.supabase.co",
  "supabaseAnonKey": "SUA_SUPABASE_ANON_KEY",
  "redirectUrl": "wplay://auth/callback",
  "steamWebApiKey": "SUA_STEAM_WEB_API_KEY"
}
```

Notas:
- `supabaseUrl`/`supabaseAnonKey` continuam sendo usados para catalogo remoto.
- Login agora depende de `steamWebApiKey`.

## 3) Informar `steamAppId` dos jogos

Para o launcher puxar horas e conquistas de um jogo, ele precisa do `steamAppId`.

Exemplo no catalogo:
- JSON: `"steamAppId": 3241660`
- Supabase: `steam_app_id = 3241660`

## 4) Atualizar banco (se usar Supabase)

Execute `docs/SUPABASE_SQL_CATALOGO_JOGOS.sql` (a versao atual ja inclui `steam_app_id`).

## 5) Testar

1. Abra o launcher.
2. Clique em `Continuar com Steam`.
3. Depois do login:
   - `AVG. PLAY TIME` passa a mostrar horas do usuario no jogo.
   - `AVG. ACHIEV.` passa a mostrar % de conquistas do usuario no jogo.

Se o jogo nao tiver `steamAppId`, o launcher mostra os valores padrao do catalogo.
