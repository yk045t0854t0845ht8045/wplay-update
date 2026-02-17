# Tutorial Auto Update (GitHub Releases)

Este guia ativa atualizacao automatica do launcher sem seus amigos baixarem outro `.exe` manualmente.

## 1) O que precisa

- Repositorio do launcher no GitHub
- App instalado via **NSIS** (`npm run build`)
- `config/updater.json` preenchido
- Release com arquivos do Electron Builder (`latest.yml`, `.exe`, `.blockmap`)

Observacao: build `portable` normalmente nao participa do fluxo padrao de auto update.

## 2) Configurar updater no projeto

Copie:

`config/updater.example.json` -> `config/updater.json`

Exemplo:

```json
{
  "enabled": true,
  "owner": "SEU_USUARIO_OU_ORG",
  "repo": "SEU_REPO_DO_LAUNCHER",
  "channel": "latest",
  "updateOnLaunch": true,
  "autoDownload": true,
  "checkIntervalMinutes": 12,
  "allowPrerelease": false,
  "allowDowngrade": false
}
```

## 3) Publicar releases automaticamente com tag

O projeto ja inclui workflow:

`/.github/workflows/release-launcher.yml`

Ele roda em tag `v*`, builda e publica no GitHub Release com os arquivos de update.

Fluxo:

1. Ajuste `version` no `package.json` (ex: `1.0.1`).
2. Commit:
   `git add .`
   `git commit -m "release 1.0.1"`
3. Crie tag e envie:
   `git tag v1.0.1`
   `git push origin main --tags`

Pronto: o GitHub Actions gera release automaticamente.

## 4) Comportamento no launcher

- Ao abrir: checa update em segundo plano.
- Em execucao: checa periodicamente (`checkIntervalMinutes`).
- Se achar update: aparece icone verde ao lado do sino.
- Quando download terminar: clicar no icone abre modal para reiniciar e atualizar.

## 5) Comando alternativo local (sem Actions)

Se quiser publicar release direto da sua maquina:

```powershell
$env:GH_TOKEN="SEU_TOKEN_GITHUB"
npm run release:github
```

## 6) Erros comuns

- `owner/repo` errado em `config/updater.json`
- release sem `latest.yml`
- app nao instalado (rodando em dev)
- usar build `portable` esperando update automatico

### Erro: Cannot find latest.yml

Se aparecer algo como:

`Cannot find latest.yml in the latest release artifacts ...`

Significa que o updater esta apontando para um repo/release que nao e do launcher (normalmente repo de jogos/assets).

Correcao:

1. Use um repo exclusivo para o launcher (ex: `wplay-launcher`).
2. Publique release do launcher com Electron Builder (`npm run release:github`), para gerar:
   - `latest.yml`
   - instalador `.exe`
   - `.blockmap`
3. So depois disso deixe `enabled: true` em `config/updater.json`.
