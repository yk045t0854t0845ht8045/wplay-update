# Tutorial: GitHub Releases (Fluxo Completo)

Este guia cobre um fluxo completo para publicar o arquivo `.rar`/`.zip` no GitHub
e atualizar o `config/games.json` automaticamente.

## Limite importante do GitHub

Cada asset de Release do GitHub precisa ter **menos de 2 GiB**.
Para jogos acima disso, use outro host para arquivo grande (R2/B2/Wasabi) ou espelhos.

Referencia oficial:
`https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github#distributing-large-binaries`

## 1) Pre-requisitos

1. Tenha um repositorio publico para os arquivos (exemplo: `seu-user/wplay-assets`).
2. Instale GitHub CLI (`gh`): `https://cli.github.com/`
3. Faca login no GitHub CLI:

```powershell
gh auth login
```

4. Verifique se o comando `gh` esta funcionando:

```powershell
gh --version
```

## 2) Script automatico do projeto

O projeto agora inclui:
`scripts/publish-game-to-github.ps1`

Se quiser enviar manualmente sem script:

```powershell
gh release create repo-v0.3.2 "C:\pacotes\REPO.v0.3.2-OFME.rar" `
  --repo "SEU_USUARIO/wplay-assets" `
  --title "REPO v0.3.2" `
  --notes "Release do jogo REPO"
```

Link direto gerado:

```text
https://github.com/SEU_USUARIO/wplay-assets/releases/download/repo-v0.3.2/REPO.v0.3.2-OFME.rar
```

Esse script faz:
- calcula SHA-256 do arquivo
- cria release (ou atualiza upload da release existente)
- gera link direto do asset
- atualiza `config/games.json` no `game.id` informado
- grava `downloadSources` com `github-release`
- grava `checksumSha256`

### Comando pronto (exemplo)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-game-to-github.ps1 `
  -Owner "SEU_USUARIO" `
  -Repo "wplay-assets" `
  -GameId "repo" `
  -AssetPath "C:\pacotes\REPO.v0.3.2-OFME.rar" `
  -Tag "repo-v0.3.2" `
  -ReleaseTitle "REPO v0.3.2" `
  -ArchivePassword "online-fix.me" `
  -LaunchExecutable "REPO\\REPO.EXE" `
  -SetLegacyDownloadUrl
```

### Comando via npm

```powershell
npm run gh:publish-game -- `
  -Owner "SEU_USUARIO" `
  -Repo "wplay-assets" `
  -GameId "repo" `
  -AssetPath "C:\pacotes\REPO.v0.3.2-OFME.rar" `
  -Tag "repo-v0.3.2"
```

## 3) Como funciona no `games.json`

Depois do script, o jogo fica parecido com:

```json
{
  "id": "repo",
  "archiveType": "rar",
  "checksumSha256": "sha256_do_arquivo",
  "downloadSources": [
    {
      "url": "https://github.com/SEU_USUARIO/wplay-assets/releases/download/repo-v0.3.2/REPO.v0.3.2-OFME.rar",
      "label": "github-release",
      "kind": "github",
      "priority": 10
    }
  ]
}
```

## 4) Parametros uteis do script

- `-Owner`: dono do repositorio GitHub
- `-Repo`: nome do repositorio GitHub
- `-GameId`: `id` do jogo no `games.json`
- `-AssetPath`: caminho do `.rar`/`.zip`
- `-Tag`: tag da release (ex: `repo-v0.3.2`)
- `-ReleaseTitle`: titulo da release
- `-ReleaseNotes`: notas da release
- `-GenerateNotes`: usa notas automaticas do GitHub
- `-PreRelease`: marca release como pre-release
- `-Draft`: cria release draft
- `-SkipUpload`: nao envia asset (so cria/ajusta release)
- `-SkipConfigUpdate`: nao altera `games.json`
- `-ArchiveType`: forca `zip`, `rar` ou `none`
- `-ArchivePassword`: atualiza senha do jogo
- `-LaunchExecutable`: atualiza executavel de inicializacao
- `-SourcePriority`: prioridade de `downloadSources` (default: `10`)
- `-GhPath`: caminho manual do `gh.exe` (use se o comando `gh` nao estiver no PATH)
- `-SetLegacyDownloadUrl`: tambem grava o campo antigo `downloadUrl`

## 5) Fluxo recomendado de publicacao

1. Gere o `.rar`/`.zip` final.
2. Rode o script para subir no GitHub e atualizar o config.
3. Inicie o launcher e teste download/instalacao.
4. Se OK, commit no `config/games.json`.

## 6) Boas praticas

1. Nao renomeie asset depois de publicar release.
2. Sempre mantenha `checksumSha256`.
3. Tenha pelo menos 1 mirror extra em `downloadUrls`.
4. Para arquivo gigante (> 2 GiB), nao use GitHub Release como fonte unica.
