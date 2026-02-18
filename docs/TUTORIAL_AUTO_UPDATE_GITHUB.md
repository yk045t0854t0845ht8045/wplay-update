# Tutorial Auto Update (GitHub Releases)

Este guia publica o launcher com update automatico para todos os usuarios.

## 1) Configuracao do updater

Preencha `config/updater.json`:

```json
{
  "enabled": true,
  "owner": "yk045t0854t0845ht8045",
  "repo": "wplay-update",
  "provider": "auto",
  "channel": "latest",
  "updateOnLaunch": true,
  "autoRestartOnStartup": true,
  "autoDownload": true,
  "checkIntervalMinutes": 1,
  "allowPrerelease": false,
  "allowDowngrade": false
}
```

Com `checkIntervalMinutes: 1`, launcher aberto detecta update em ate ~1 minuto.
Com `autoRestartOnStartup: true`, se abrir o launcher e existir update, ele baixa e reinicia sozinho para aplicar (sem pedir novo download manual).
Com `provider: "auto"`, o launcher prefere feed direto (`releases/latest/download`) para evitar erro 403 de rate limit da API do GitHub.
O update do launcher agora e aplicado em modo silencioso (sem assistente de desinstalar/instalar na tela).

## 2) Comando unico (recomendado)

Agora existe comando unico:

```powershell
npm run update-now
```

Esse comando agora sincroniza o repositorio automaticamente antes da release:

1. detecta alteracoes pendentes
2. faz `git add -A`
3. cria commit de sincronizacao
4. faz `git push origin HEAD`

Ele faz:

1. incrementa versao automaticamente (`patch`)
2. cria commit/tag de release
3. envia para GitHub
4. aguarda o GitHub Actions publicar release completa com:
   - `latest.yml`
   - instalador `.exe`
   - `.blockmap`

O script so conclui quando os 3 arquivos estiverem disponiveis (evita falso erro por release criada antes do upload terminar).
O workflow do GitHub tambem valida os 3 assets ao final e falha com mensagem clara se faltar algo.

Modo padrao (`workflow`) nao precisa token local.

Se aparecer erro `403` por rate limit durante a espera da release, rode com token apenas para consulta da API:

```powershell
$env:GH_TOKEN="SEU_TOKEN"
$env:GITHUB_TOKEN=$env:GH_TOKEN
npm run update-now
```

```cmd
set GH_TOKEN=SEU_TOKEN
set GITHUB_TOKEN=%GH_TOKEN%
npm.cmd run update-now
```

Importante: comando com `$env:` e `Invoke-RestMethod` e so para PowerShell.  
No CMD use `set ...` e `npm.cmd ...`.

## 3) Modo local (opcional)

Se quiser forcar publicacao local via token (sem esperar Actions):

```powershell
npm run update-now -- -Mode local
```

Nesse modo, ele:

1. valida token no repo de update
2. incrementa versao automaticamente (`patch`)
3. builda o launcher
4. publica release no GitHub com:
   - `latest.yml`
   - instalador `.exe`
   - `.blockmap`

Se nao houver `GH_TOKEN` no ambiente, o script pede o token na hora.

## 4) Token necessario (somente modo local)

PAT (fine-grained) com acesso ao repo `wplay-update`:

- Repository access: `wplay-update`
- Permissions:
  - `Contents: Read and write`
  - `Metadata: Read`

## 5) Validar release publicada

```powershell
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/yk045t0854t0845ht8045/wplay-update/releases/tags/v$version" -Headers @{ "User-Agent"="WPlay" }
$release.assets | Select-Object name,size,browser_download_url
$release.assets.name -contains "latest.yml"
```

Tem que retornar `True` no ultimo comando.

## 6) Por que o icone verde nao aparece?

O icone de update so aparece quando:

1. existe release valida com `latest.yml`
2. a release tem versao maior que a instalada
3. launcher esta rodando build instalado (nao `npm run dev`)

## 7) Mudou so front-end e nao atualizou?

Mesmo alterando apenas textos/CSS/JS de interface, o update so dispara quando existe nova release com versao maior.

Fluxo correto:

1. aplicar alteracoes no codigo
2. rodar `npm run update-now` para gerar nova versao/tag/release
3. confirmar no GitHub Release os arquivos `latest.yml`, `.exe` e `.blockmap`

Sem nova release/versionamento, o launcher vai considerar que ja esta atualizado.
