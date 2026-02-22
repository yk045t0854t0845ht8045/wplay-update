param(
  [string]$CommitMessage = "",
  [string]$RemoteUrl = "",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $false)][string[]]$Arguments = @()
  )

  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Command @Arguments | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar: $Command $($Arguments -join ' ')"
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$siteDir = Join-Path $repoRoot "site"
if (-not (Test-Path $siteDir)) {
  throw "Pasta 'site' nao encontrada em: $siteDir"
}

$defaultRemoteUrl = "https://github.com/yk045t0854t0845ht8045/origin-web.git"
$resolvedRemoteUrl = if ($RemoteUrl) {
  [string]$RemoteUrl
} elseif ($env:SITE_REMOTE_URL) {
  [string]$env:SITE_REMOTE_URL
} else {
  $defaultRemoteUrl
}

Push-Location $siteDir
try {
  if (-not (Test-Path (Join-Path $siteDir ".git"))) {
    Write-Host ""
    Write-Host "Repositorio Git do site nao encontrado. Inicializando..." -ForegroundColor Yellow

    & git init -b $Branch | Out-Host
    if ($LASTEXITCODE -ne 0) {
      & git init | Out-Host
      if ($LASTEXITCODE -ne 0) {
        throw "Falha ao inicializar repositorio Git da pasta site."
      }
      & git checkout -B $Branch | Out-Host
      if ($LASTEXITCODE -ne 0) {
        throw "Falha ao criar/alternar para branch '$Branch' no repositorio do site."
      }
    }
  }

  $remoteNames = ((& git remote | Out-String).Trim() -split "\s+" | Where-Object { $_ })
  if ($remoteNames -notcontains "origin") {
    if (-not $resolvedRemoteUrl) {
      throw (
        "Remote origin ausente no site e nenhum RemoteUrl informado. " +
        "Use -RemoteUrl ou defina SITE_REMOTE_URL."
      )
    }
    Invoke-Checked -Title "Configurando remote origin ($resolvedRemoteUrl)" -Command "git" -Arguments @("remote", "add", "origin", $resolvedRemoteUrl)
  }

  Invoke-Checked -Title "git status (antes)" -Command "git" -Arguments @("status")
  Invoke-Checked -Title "git add ." -Command "git" -Arguments @("add", ".")
  Invoke-Checked -Title "git status (depois do add)" -Command "git" -Arguments @("status")

  $stagedFiles = (& git diff --cached --name-only | Out-String).Trim()
  if (-not $stagedFiles) {
    Write-Host ""
    Write-Host "Sem alteracoes para commit no site." -ForegroundColor DarkGray
    exit 0
  }

  if (-not $CommitMessage) {
    $CommitMessage = Read-Host "Mensagem de commit do site"
  }
  $CommitMessage = [string]$CommitMessage
  if (-not $CommitMessage.Trim()) {
    throw "Mensagem de commit vazia. Operacao cancelada."
  }

  Invoke-Checked -Title "git commit" -Command "git" -Arguments @("commit", "-m", $CommitMessage.Trim())
  Invoke-Checked -Title "git push" -Command "git" -Arguments @("push", "-u", "origin", $Branch)

  Write-Host ""
  Write-Host "Publicacao do site concluida com sucesso." -ForegroundColor Green
} finally {
  Pop-Location
}
