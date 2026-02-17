[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Owner,

  [Parameter(Mandatory = $true)]
  [string]$Repo,

  [Parameter(Mandatory = $true)]
  [string]$GameId,

  [Parameter(Mandatory = $true)]
  [string]$AssetPath,

  [Parameter(Mandatory = $true)]
  [string]$Tag,

  [string]$ReleaseTitle = "",
  [string]$ReleaseNotes = "",
  [string]$ConfigPath = "config/games.json",
  [string]$ArchiveType = "",
  [string]$ArchivePassword = "",
  [string]$LaunchExecutable = "",
  [int]$SourcePriority = 10,
  [string]$GhPath = "",
  [switch]$GenerateNotes,
  [switch]$PreRelease,
  [switch]$Draft,
  [switch]$SkipUpload,
  [switch]$SkipConfigUpdate,
  [switch]$SetLegacyDownloadUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$script:GhExecutable = ""

function Resolve-GhExecutable {
  if ($script:GhExecutable -and (Test-Path -LiteralPath $script:GhExecutable)) {
    return $script:GhExecutable
  }

  $cmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) {
    $script:GhExecutable = [string]$cmd.Source
    return $script:GhExecutable
  }

  $candidates = @(
    (Join-Path ($env:ProgramW6432 -or "") "GitHub CLI\gh.exe"),
    (Join-Path ($env:ProgramW6432 -or "") "GitHub CLI\bin\gh.exe"),
    (Join-Path ($env:ProgramFiles -or "") "GitHub CLI\gh.exe"),
    (Join-Path ($env:ProgramFiles -or "") "GitHub CLI\bin\gh.exe"),
    (Join-Path (${env:ProgramFiles(x86)} -or "") "GitHub CLI\gh.exe"),
    (Join-Path (${env:ProgramFiles(x86)} -or "") "GitHub CLI\bin\gh.exe"),
    (Join-Path ($env:LOCALAPPDATA -or "") "Programs\GitHub CLI\gh.exe"),
    "C:\Program Files\GitHub CLI\gh.exe",
    "C:\Program Files\GitHub CLI\bin\gh.exe",
    "C:\Program Files (x86)\GitHub CLI\gh.exe",
    "C:\Program Files (x86)\GitHub CLI\bin\gh.exe"
  ) | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique

  try {
    $whereOutput = & where.exe gh 2>$null
    foreach ($line in $whereOutput) {
      $candidate = [string]$line
      if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        $candidates += $candidate
      }
    }
    $candidates = $candidates | Select-Object -Unique
  } catch {
    # Ignore.
  }

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      $script:GhExecutable = $candidate
      return $script:GhExecutable
    }
  }

  throw "Comando 'gh' nao encontrado. Instale o GitHub CLI (winget install --id GitHub.cli -e) e abra um novo PowerShell."
}

function Invoke-GhRaw {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $ghPath = Resolve-GhExecutable
    $lines = & $ghPath @Args 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  $outputText = ($lines | ForEach-Object { [string]$_ } | Where-Object { $_ -and $_.Trim() } ) -join [Environment]::NewLine
  return [PSCustomObject]@{
    ExitCode = [int]$exitCode
    Output   = [string]$outputText
  }
}

function Invoke-Gh {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args,

    [switch]$Quiet
  )

  $result = Invoke-GhRaw -Args $Args
  if ($result.ExitCode -ne 0) {
    if ($result.Output) {
      throw $result.Output
    }
    throw "Falha no comando: gh $($Args -join ' ')"
  }

  if (-not $Quiet -and $result.Output) {
    Write-Host $result.Output
  }

  return $result.Output
}

function Test-GhReleaseExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoSlug,

    [Parameter(Mandatory = $true)]
    [string]$ReleaseTag
  )

  $check = Invoke-GhRaw -Args @("release", "view", $ReleaseTag, "--repo", $RepoSlug)
  return ($check.ExitCode -eq 0)
}

function Assert-GhRepoAccessible {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoSlug
  )

  $check = Invoke-GhRaw -Args @("repo", "view", $RepoSlug)
  if ($check.ExitCode -ne 0) {
    throw "Repositorio '$RepoSlug' nao encontrado ou sem acesso. Crie com: gh repo create $RepoSlug --public"
  }
}

function Ensure-GhRepoInitialized {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoSlug
  )

  $commitCheck = Invoke-GhRaw -Args @("api", "repos/$RepoSlug/commits?per_page=1", "--jq", ".[0].sha")
  $sha = [string]$commitCheck.Output
  if ($commitCheck.ExitCode -eq 0 -and $sha -match "^[0-9a-f]{7,40}$") {
    return
  }

  Write-Host "Repositorio sem commits detectado. Criando commit inicial..."
  $readmeContent = "# wplay-assets`nArquivos para distribuicao do launcher.`n"
  $encodedReadme = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($readmeContent))
  Invoke-Gh -Args @(
    "api",
    "repos/$RepoSlug/contents/README.md",
    "-X", "PUT",
    "-f", "message=chore: initial commit",
    "-f", "content=$encodedReadme"
  ) -Quiet
}

function Wait-GhReleaseVisibility {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoSlug,

    [Parameter(Mandatory = $true)]
    [string]$ReleaseTag,

    [int]$MaxAttempts = 8
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    if (Test-GhReleaseExists -RepoSlug $RepoSlug -ReleaseTag $ReleaseTag) {
      return
    }
    $waitSeconds = [Math]::Min(8, $attempt + 1)
    Write-Host "Aguardando release '$ReleaseTag' ficar visivel no GitHub ($attempt/$MaxAttempts)..."
    Start-Sleep -Seconds $waitSeconds
  }

  throw "Release '$ReleaseTag' nao ficou visivel no GitHub apos varias tentativas."
}

function Upload-GhReleaseAssetWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoSlug,

    [Parameter(Mandatory = $true)]
    [string]$ReleaseTag,

    [Parameter(Mandatory = $true)]
    [string]$AssetFullPath,

    [int]$MaxAttempts = 4
  )

  $lastError = $null
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      Invoke-Gh -Args @("release", "upload", $ReleaseTag, $AssetFullPath, "--repo", $RepoSlug, "--clobber")
      return
    } catch {
      $lastError = $_.Exception
      $message = [string]$lastError.Message
      $isNotFound = $message -match "release not found"
      if ($attempt -lt $MaxAttempts -and $isNotFound) {
        $waitSeconds = [Math]::Min(6, $attempt * 2)
        Write-Host "Release ainda nao visivel no GitHub. Tentando upload novamente em $waitSeconds s..."
        Start-Sleep -Seconds $waitSeconds
        continue
      }
      throw
    }
  }

  if ($lastError) {
    throw $lastError
  }
}

function Resolve-ArchiveType {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PathValue,

    [string]$OverrideType = ""
  )

  $override = [string]$OverrideType
  if ($override) {
    $normalized = $override.Trim().ToLowerInvariant()
    if ($normalized -in @("zip", "rar", "none")) {
      return $normalized
    }
    throw "ArchiveType invalido: '$OverrideType'. Use zip, rar ou none."
  }

  $ext = [IO.Path]::GetExtension($PathValue).ToLowerInvariant()
  if ($ext -eq ".zip") {
    return "zip"
  }
  if ($ext -eq ".rar") {
    return "rar"
  }
  return "none"
}

function Get-CatalogContext {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CatalogPath
  )

  if (-not (Test-Path -LiteralPath $CatalogPath)) {
    throw "Arquivo de catalogo nao encontrado: $CatalogPath"
  }

  $raw = Get-Content -LiteralPath $CatalogPath -Raw
  $parsed = $raw | ConvertFrom-Json

  if ($parsed -is [Array]) {
    return [PSCustomObject]@{
      Mode  = "array"
      Root  = $parsed
      Games = $parsed
    }
  }

  if (
    $parsed -is [PSCustomObject] -and
    $parsed.PSObject.Properties.Name -contains "games" -and
    $parsed.games -is [Array]
  ) {
    return [PSCustomObject]@{
      Mode  = "object"
      Root  = $parsed
      Games = $parsed.games
    }
  }

  throw "Formato invalido em $CatalogPath. Esperado array ou objeto com { settings, games }."
}

function Save-CatalogContext {
  param(
    [Parameter(Mandatory = $true)]
    [PSCustomObject]$CatalogContext,

    [Parameter(Mandatory = $true)]
    [string]$CatalogPath
  )

  $serialized = $CatalogContext.Root | ConvertTo-Json -Depth 100
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($CatalogPath, $serialized, $utf8NoBom)
}

function Ensure-ArrayProperty {
  param(
    [Parameter(Mandatory = $true)]
    [PSCustomObject]$Target,

    [Parameter(Mandatory = $true)]
    [string]$PropertyName
  )

  if (-not ($Target.PSObject.Properties.Name -contains $PropertyName)) {
    $Target | Add-Member -NotePropertyName $PropertyName -NotePropertyValue @()
    return
  }

  if ($null -eq $Target.$PropertyName) {
    $Target.$PropertyName = @()
    return
  }

  if ($Target.$PropertyName -isnot [Array]) {
    $Target.$PropertyName = @($Target.$PropertyName)
  }
}

try {
  $scriptDir = Split-Path -Parent $PSCommandPath
  $repoRoot = Resolve-Path (Join-Path $scriptDir "..")
  Set-Location $repoRoot

  if (-not [string]::IsNullOrWhiteSpace($GhPath)) {
    $manualGhPath = [string](Resolve-Path -LiteralPath $GhPath).Path
    if (-not (Test-Path -LiteralPath $manualGhPath)) {
      throw "GhPath invalido: $GhPath"
    }
    $script:GhExecutable = $manualGhPath
  }

  [void](Resolve-GhExecutable)

  $repoSlug = "$Owner/$Repo"
  Assert-GhRepoAccessible -RepoSlug $repoSlug
  Ensure-GhRepoInitialized -RepoSlug $repoSlug
  $resolvedAsset = Resolve-Path -LiteralPath $AssetPath
  $assetPathFull = $resolvedAsset.Path
  $assetName = [IO.Path]::GetFileName($assetPathFull)
  if (-not $assetName) {
    throw "AssetPath invalido: $AssetPath"
  }

  $assetInfo = Get-Item -LiteralPath $assetPathFull
  if (-not $assetInfo.Exists -or $assetInfo.Length -le 0) {
    throw "Arquivo invalido para upload: $assetPathFull"
  }

  $archiveTypeResolved = Resolve-ArchiveType -PathValue $assetPathFull -OverrideType $ArchiveType
  $sha256 = (Get-FileHash -LiteralPath $assetPathFull -Algorithm SHA256).Hash.ToLowerInvariant()
  $downloadUrl = "https://github.com/$repoSlug/releases/download/$Tag/$assetName"

  $releaseExists = Test-GhReleaseExists -RepoSlug $repoSlug -ReleaseTag $Tag
  $resolvedTitle = if ([string]::IsNullOrWhiteSpace($ReleaseTitle)) { $Tag } else { $ReleaseTitle.Trim() }

  if (-not $releaseExists) {
    $createArgs = @("release", "create", $Tag, "--repo", $repoSlug, "--title", $resolvedTitle)
    if ($GenerateNotes) {
      $createArgs += "--generate-notes"
    } elseif (-not [string]::IsNullOrWhiteSpace($ReleaseNotes)) {
      $createArgs += @("--notes", $ReleaseNotes.Trim())
    } else {
      $createArgs += @("--notes", "Release automatica para distribuicao de jogo.")
    }
    if ($PreRelease) {
      $createArgs += "--prerelease"
    }
    if ($Draft) {
      $createArgs += "--draft"
    }

    Write-Host "Criando release '$Tag' em $repoSlug..."
    Invoke-Gh -Args $createArgs -Quiet
    Wait-GhReleaseVisibility -RepoSlug $repoSlug -ReleaseTag $Tag
  }

  if (-not $SkipUpload) {
    Write-Host "Enviando/atualizando asset em '$Tag'..."
    Upload-GhReleaseAssetWithRetry -RepoSlug $repoSlug -ReleaseTag $Tag -AssetFullPath $assetPathFull
  } else {
    Write-Host "Upload ignorado por -SkipUpload."
  }

  if (-not $SkipConfigUpdate) {
    $resolvedConfig = Resolve-Path -LiteralPath $ConfigPath
    $catalog = Get-CatalogContext -CatalogPath $resolvedConfig.Path
    $game = $catalog.Games | Where-Object { [string]$_.id -eq $GameId } | Select-Object -First 1
    if (-not $game) {
      $knownIds = ($catalog.Games | ForEach-Object { [string]$_.id } | Where-Object { $_ } | Sort-Object) -join ", "
      throw "GameId '$GameId' nao encontrado em $ConfigPath. IDs disponiveis: $knownIds"
    }

    Ensure-ArrayProperty -Target $game -PropertyName "downloadSources"
    Ensure-ArrayProperty -Target $game -PropertyName "downloadUrls"

    $githubSource = [PSCustomObject]@{
      url      = $downloadUrl
      label    = "github-release"
      kind     = "github"
      priority = $SourcePriority
    }

    $game.downloadSources = @($githubSource)
    $game.checksumSha256 = $sha256
    $game.archiveType = $archiveTypeResolved

    if ($game.PSObject.Properties.Name -contains "googleDriveFileId") {
      $game.PSObject.Properties.Remove("googleDriveFileId")
    }

    if (-not [string]::IsNullOrWhiteSpace($ArchivePassword)) {
      $game.archivePassword = $ArchivePassword.Trim()
    }
    if (-not [string]::IsNullOrWhiteSpace($LaunchExecutable)) {
      $game.launchExecutable = $LaunchExecutable.Trim()
    }
    if ($SetLegacyDownloadUrl) {
      $game.downloadUrl = $downloadUrl
    }

    Save-CatalogContext -CatalogContext $catalog -CatalogPath $resolvedConfig.Path
    Write-Host "config atualizado: $($resolvedConfig.Path)"
  } else {
    Write-Host "Atualizacao do config ignorada por -SkipConfigUpdate."
  }

  Write-Host ""
  Write-Host "Publicacao concluida."
  Write-Host "Repositorio: $repoSlug"
  Write-Host "Tag: $Tag"
  Write-Host "Arquivo: $assetName"
  Write-Host "SHA256: $sha256"
  Write-Host "Download URL: $downloadUrl"
}
catch {
  Write-Error $_.Exception.Message
  exit 1
}
