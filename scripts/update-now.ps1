param(
  [ValidateSet("patch", "minor", "major")]
  [string]$VersionType = "patch",
  [ValidateSet("workflow", "local")]
  [string]$Mode = "workflow",
  [string]$GitHubToken = ""
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )
  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Action
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $false)][string[]]$Arguments = @()
  )
  Invoke-Step -Title $Title -Action {
    & $Command @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao executar: $Command $($Arguments -join ' ')"
    }
  }
}

function Get-GitStatusPorcelain {
  $statusText = (& git status --porcelain=v1 | Out-String).Trim()
  return [string]$statusText
}

function Sync-RepositoryBeforeRelease {
  param(
    [Parameter(Mandatory = $false)][string]$CommitMessage = "",
    [Parameter(Mandatory = $false)][bool]$PushToRemote = $true
  )

  $pending = Get-GitStatusPorcelain
  if (-not $pending) {
    Write-Host ""
    Write-Host "Repositorio Git ja esta sincronizado (sem alteracoes pendentes)." -ForegroundColor DarkGray
    return
  }

  if (-not $CommitMessage) {
    $CommitMessage = "chore: sync repo before update release"
  }

  Invoke-Step -Title "Sincronizando repositorio Git antes do update" -Action {
    & git add -A | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao executar: git add -A"
    }

    $stagedNames = (& git diff --cached --name-only | Out-String).Trim()
    if (-not $stagedNames) {
      Write-Host "Nenhum arquivo elegivel para commit apos git add -A. Seguindo..." -ForegroundColor DarkGray
      return
    }

    & git commit -m $CommitMessage | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao criar commit de sincronizacao do repositorio."
    }

    if ($PushToRemote) {
      & git push origin HEAD | Out-Host
      if ($LASTEXITCODE -ne 0) {
        throw "Falha ao enviar commit de sincronizacao para origin/HEAD."
      }
    }
  }
}

function Get-PlainTextFromSecureString {
  param([Parameter(Mandatory = $true)][System.Security.SecureString]$SecureValue)
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Get-VersionFromPackageJson {
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $version = [string]$pkg.version
  if (-not $version) {
    throw "Nao foi possivel ler versao em package.json."
  }
  return $version
}

function Test-GitTrackedFile {
  param([Parameter(Mandatory = $true)][string]$RelativePath)
  try {
    & git ls-files --error-unmatch -- "$RelativePath" *> $null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Assert-ReleaseBuildAssetsReady {
  $requiredFiles = @(
    "build/icon.ico",
    "build/icon.png"
  )

  foreach ($relativePath in $requiredFiles) {
    if (-not (Test-Path $relativePath)) {
      throw "Arquivo obrigatorio ausente para release: $relativePath. Adicione o icone e tente novamente."
    }

    if (-not (Test-GitTrackedFile -RelativePath $relativePath)) {
      & git add -- "$relativePath" *> $null
      if (-not (Test-GitTrackedFile -RelativePath $relativePath)) {
        throw (
          "Arquivo $relativePath existe localmente, mas nao foi possivel adicionar ao Git automaticamente. " +
          "Rode: git add $relativePath e commit antes de publicar."
        )
      }
      Write-Host "Arquivo $relativePath adicionado ao Git automaticamente." -ForegroundColor DarkGray
    }
  }

  if (-not (Test-Path "jogos")) {
    New-Item -ItemType Directory -Path "jogos" -Force | Out-Null
    Write-Host "Pasta opcional 'jogos' nao encontrada. Criada vazia para evitar aviso no build." -ForegroundColor DarkGray
  }
}

function Get-HttpStatusCodeFromError {
  param([Parameter(Mandatory = $true)]$ErrorRecord)
  try {
    return [int]$ErrorRecord.Exception.Response.StatusCode.value__
  } catch {
    return 0
  }
}

function Get-HttpErrorBodyText {
  param([Parameter(Mandatory = $true)]$ErrorRecord)
  try {
    $response = $ErrorRecord.Exception.Response
    if (-not $response) {
      return ""
    }
    $stream = $response.GetResponseStream()
    if (-not $stream) {
      return ""
    }
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    $reader.Close()
    if (-not $body) {
      return ""
    }
    return [string]$body
  } catch {
    return ""
  }
}

function Resolve-GitHubApiToken {
  param([string]$ExplicitToken = "")
  if ($ExplicitToken) {
    return [string]$ExplicitToken
  }
  if ($env:GH_TOKEN) {
    return [string]$env:GH_TOKEN
  }
  if ($env:GITHUB_TOKEN) {
    return [string]$env:GITHUB_TOKEN
  }

  $ghCommand = Get-Command "gh" -ErrorAction SilentlyContinue
  if ($ghCommand) {
    try {
      $token = (& $ghCommand.Source auth token | Out-String).Trim()
      if ($LASTEXITCODE -eq 0 -and $token) {
        return [string]$token
      }
    } catch {
      # Ignora: segue sem token.
    }
  }

  return ""
}

function Get-LatestWorkflowRunInfo {
  param(
    [Parameter(Mandatory = $true)][string]$Owner,
    [Parameter(Mandatory = $true)][string]$Repo,
    [string]$ApiToken = ""
  )

  try {
    $headers = New-GitHubApiHeaders -Token $ApiToken
    $url = "https://api.github.com/repos/$Owner/$Repo/actions/runs?per_page=1"
    $payload = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    $run = $null
    if ($payload -and $payload.workflow_runs -and $payload.workflow_runs.Count -gt 0) {
      $run = $payload.workflow_runs[0]
    }
    if (-not $run) {
      return $null
    }
    return [pscustomobject]@{
      status       = [string]$run.status
      conclusion   = [string]$run.conclusion
      html_url     = [string]$run.html_url
      head_branch  = [string]$run.head_branch
      display_title = [string]$run.display_title
      event        = [string]$run.event
      run_id       = [string]$run.id
    }
  } catch {
    return $null
  }
}

function Get-LatestWorkflowRunSummary {
  param(
    [Parameter(Mandatory = $true)][string]$Owner,
    [Parameter(Mandatory = $true)][string]$Repo,
    [string]$ApiToken = ""
  )

  $run = Get-LatestWorkflowRunInfo -Owner $Owner -Repo $Repo -ApiToken $ApiToken
  if (-not $run) {
    return ""
  }

  return "workflow status=$($run.status) conclusion=$($run.conclusion) url=$($run.html_url)"
}

function New-GitHubApiHeaders {
  param([string]$Token = "")
  $headers = @{
    "User-Agent" = "WPlay-UpdateNow"
    "Accept"     = "application/vnd.github+json"
  }
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }
  return $headers
}

function New-GitHubWebHeaders {
  param([string]$Token = "")
  $headers = @{
    "User-Agent" = "WPlay-UpdateNow"
  }
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }
  return $headers
}

function Test-HttpUrlExists {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $false)][hashtable]$Headers = @{},
    [int]$TimeoutMs = 20000
  )

  $request = [System.Net.HttpWebRequest]::Create($Url)
  $request.Method = "HEAD"
  $request.AllowAutoRedirect = $true
  $request.Timeout = $TimeoutMs
  $request.ReadWriteTimeout = $TimeoutMs

  foreach ($entry in $Headers.GetEnumerator()) {
    $name = [string]$entry.Key
    $value = [string]$entry.Value
    if (-not $name -or -not $value) {
      continue
    }

    switch ($name.ToLowerInvariant()) {
      "user-agent" { $request.UserAgent = $value; continue }
      "accept" { $request.Accept = $value; continue }
      default { $request.Headers[$name] = $value; continue }
    }
  }

  try {
    $response = [System.Net.HttpWebResponse]$request.GetResponse()
    $statusCode = [int]$response.StatusCode
    $response.Close()
    return [pscustomobject]@{
      Exists     = ($statusCode -ge 200 -and $statusCode -lt 400)
      StatusCode = $statusCode
      ErrorBody  = ""
    }
  } catch [System.Net.WebException] {
    $statusCode = 0
    $errorBody = ""
    $response = $_.Exception.Response
    if ($response -is [System.Net.HttpWebResponse]) {
      $statusCode = [int]$response.StatusCode
      try {
        $stream = $response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $errorBody = [string]($reader.ReadToEnd())
          $reader.Close()
        }
      } catch {
        $errorBody = ""
      }
      try { $response.Close() } catch {}
    }
    return [pscustomobject]@{
      Exists     = $false
      StatusCode = $statusCode
      ErrorBody  = $errorBody
    }
  }
}

function Get-ExpectedReleaseAssetNames {
  param([Parameter(Mandatory = $true)][string]$Tag)
  $version = [string]$Tag
  if ($version.StartsWith("v")) {
    $version = $version.Substring(1)
  }
  $exeName = "WPlay-$version-x64.exe"
  return [pscustomobject]@{
    Manifest = "latest.yml"
    Exe      = $exeName
    Blockmap = "$exeName.blockmap"
  }
}

function Get-ReleaseAssetNames {
  param($Release)
  if (-not $Release -or -not $Release.assets) {
    return @()
  }
  return @($Release.assets | ForEach-Object { [string]$_.name } | Where-Object { $_ } | Select-Object -Unique)
}

function Merge-ReleaseAssetNames {
  param(
    [AllowNull()][string[]]$Existing = @(),
    [AllowNull()][string[]]$Additional = @()
  )
  $left = if ($null -eq $Existing) { @() } else { @($Existing) }
  $right = if ($null -eq $Additional) { @() } else { @($Additional) }
  return @($left + $right | Where-Object { $_ } | Select-Object -Unique)
}

function Test-ReleaseAssetsReady {
  param(
    [Parameter(Mandatory = $true)][string]$Owner,
    [Parameter(Mandatory = $true)][string]$Repo,
    [Parameter(Mandatory = $true)][string]$Tag,
    [Parameter(Mandatory = $false)]$Release = $null,
    [Parameter(Mandatory = $false)][hashtable]$WebHeaders = @{}
  )

  $expected = Get-ExpectedReleaseAssetNames -Tag $Tag
  $assetNames = Get-ReleaseAssetNames -Release $Release
  $hasManifest = $assetNames -contains $expected.Manifest
  $hasExe = ($assetNames | Where-Object { $_ -ieq $expected.Exe -or $_ -match '\.exe$' } | Select-Object -First 1) -ne $null
  $hasBlockmap = ($assetNames | Where-Object { $_ -ieq $expected.Blockmap -or $_ -match '\.blockmap$' } | Select-Object -First 1) -ne $null

  $baseDownloadUrl = "https://github.com/$Owner/$Repo/releases/download/$Tag"
  $manifestUrl = "$baseDownloadUrl/$($expected.Manifest)"
  $exeUrl = "$baseDownloadUrl/$($expected.Exe)"
  $blockmapUrl = "$baseDownloadUrl/$($expected.Blockmap)"

  if (-not $hasManifest) {
    $probe = Test-HttpUrlExists -Url $manifestUrl -Headers $WebHeaders
    if ($probe.Exists) {
      $hasManifest = $true
      $assetNames = Merge-ReleaseAssetNames -Existing $assetNames -Additional @($expected.Manifest)
    }
  }
  if (-not $hasExe) {
    $probe = Test-HttpUrlExists -Url $exeUrl -Headers $WebHeaders
    if ($probe.Exists) {
      $hasExe = $true
      $assetNames = Merge-ReleaseAssetNames -Existing $assetNames -Additional @($expected.Exe)
    }
  }
  if (-not $hasBlockmap) {
    $probe = Test-HttpUrlExists -Url $blockmapUrl -Headers $WebHeaders
    if ($probe.Exists) {
      $hasBlockmap = $true
      $assetNames = Merge-ReleaseAssetNames -Existing $assetNames -Additional @($expected.Blockmap)
    }
  }

  return [pscustomobject]@{
    Ready      = ($hasManifest -and $hasExe -and $hasBlockmap)
    HasManifest = $hasManifest
    HasExe     = $hasExe
    HasBlockmap = $hasBlockmap
    AssetNames = $assetNames
    ManifestUrl = $manifestUrl
    ExeUrl      = $exeUrl
    BlockmapUrl = $blockmapUrl
  }
}

function Assert-ReleaseWorkflowHealthy {
  param(
    [Parameter(Mandatory = $true)][string]$Owner,
    [Parameter(Mandatory = $true)][string]$Repo,
    [Parameter(Mandatory = $true)][string]$Tag,
    [string]$ApiToken = ""
  )

  $run = Get-LatestWorkflowRunInfo -Owner $Owner -Repo $Repo -ApiToken $ApiToken
  if (-not $run) {
    return $null
  }

  $matchesTag = [string]$run.head_branch -eq [string]$Tag -or [string]$run.display_title -like "*$Tag*"
  if ($matchesTag -and [string]$run.status -eq "completed") {
    $conclusion = [string]$run.conclusion
    if ($conclusion -and $conclusion -ne "success") {
      throw (
        "Workflow da release $Tag terminou com status '$conclusion'. " +
        "Abra e corrija: $($run.html_url)"
      )
    }
  }

  return $run
}

function Wait-ReleaseByTag {
  param(
    [Parameter(Mandatory = $true)][string]$Owner,
    [Parameter(Mandatory = $true)][string]$Repo,
    [Parameter(Mandatory = $true)][string]$Tag,
    [string]$ApiToken = "",
    [int]$MaxAttempts = 45,
    [int]$SleepSeconds = 10
  )

  $releaseUrl = "https://api.github.com/repos/$Owner/$Repo/releases/tags/$Tag"
  $releaseHtmlUrl = "https://github.com/$Owner/$Repo/releases/tag/$Tag"
  $allowAuthenticatedApi = [bool]$ApiToken
  $apiHeaders = New-GitHubApiHeaders -Token $ApiToken
  $webHeaders = New-GitHubWebHeaders -Token $ApiToken

  for ($i = 1; $i -le $MaxAttempts; $i++) {
    $canUseApi = $allowAuthenticatedApi
    if ($canUseApi) {
      try {
        $release = Invoke-RestMethod -Uri $releaseUrl -Headers $apiHeaders -Method GET
        $assetState = Test-ReleaseAssetsReady -Owner $Owner -Repo $Repo -Tag $Tag -Release $release -WebHeaders $webHeaders
        if ($assetState.Ready) {
          $release | Add-Member -NotePropertyName "resolvedAssetNames" -NotePropertyValue $assetState.AssetNames -Force
          return $release
        }
        $runInfo = Assert-ReleaseWorkflowHealthy -Owner $Owner -Repo $Repo -Tag $Tag -ApiToken $ApiToken
        $runHint = if ($runInfo) {
          " | workflow status=$($runInfo.status) conclusion=$($runInfo.conclusion)"
        } else {
          ""
        }
        Write-Host (
          "Release $Tag criada, aguardando assets... " +
          "(latest.yml=$($assetState.HasManifest), exe=$($assetState.HasExe), blockmap=$($assetState.HasBlockmap)) " +
          "tentativa $i/$MaxAttempts$runHint"
        )
        Start-Sleep -Seconds $SleepSeconds
        continue
      } catch {
        $statusCode = Get-HttpStatusCodeFromError -ErrorRecord $_
        if ($statusCode -eq 404) {
          $runInfo = Assert-ReleaseWorkflowHealthy -Owner $Owner -Repo $Repo -Tag $Tag -ApiToken $ApiToken
          $runHint = if ($runInfo) {
            " | workflow status=$($runInfo.status) conclusion=$($runInfo.conclusion)"
          } else {
            ""
          }
          Write-Host "Aguardando release $Tag... tentativa $i/$MaxAttempts$runHint"
          Start-Sleep -Seconds $SleepSeconds
          continue
        }
        if ($statusCode -eq 401) {
          Write-Host "Token da API GitHub invalido/expirado (401). Continuando em modo publico..." -ForegroundColor Yellow
          $allowAuthenticatedApi = $false
          $ApiToken = ""
          $apiHeaders = New-GitHubApiHeaders -Token ""
          $webHeaders = New-GitHubWebHeaders -Token ""
          Start-Sleep -Seconds 2
          continue
        }
        if ($statusCode -eq 403) {
          $errorBody = (Get-HttpErrorBodyText -ErrorRecord $_).ToLowerInvariant()
          if ($errorBody -like "*rate limit*" -or $errorBody -like "*secondary rate limit*") {
            $backoff = [Math]::Max($SleepSeconds, 30)
            Write-Host "Rate limit da API do GitHub. Aguardando $backoff s (tentativa $i/$MaxAttempts)..."
            Start-Sleep -Seconds $backoff
            continue
          }
          throw "GitHub API retornou 403 ao consultar release $Tag. Verifique permissao do token GH_TOKEN para $Owner/$Repo."
        }
        throw
      }
    }

    $assetState = Test-ReleaseAssetsReady -Owner $Owner -Repo $Repo -Tag $Tag -Release $null -WebHeaders $webHeaders
    if ($assetState.Ready) {
      return [pscustomobject]@{
        tag_name  = $Tag
        html_url  = $releaseHtmlUrl
        assets    = @($assetState.AssetNames | ForEach-Object {
          [pscustomobject]@{
            name = [string]$_
            browser_download_url = "https://github.com/$Owner/$Repo/releases/download/$Tag/$([string]$_)"
          }
        })
        resolvedAssetNames = $assetState.AssetNames
        source    = "public-fallback"
      }
    }

    $releasePageProbe = Test-HttpUrlExists -Url $releaseHtmlUrl -Headers $webHeaders
    if ($releasePageProbe.Exists) {
      $runInfo = Assert-ReleaseWorkflowHealthy -Owner $Owner -Repo $Repo -Tag $Tag -ApiToken $ApiToken
      $runHint = if ($runInfo) {
        " | workflow status=$($runInfo.status) conclusion=$($runInfo.conclusion)"
      } else {
        ""
      }
      Write-Host (
        "Release $Tag criada, aguardando assets... " +
        "(latest.yml=$($assetState.HasManifest), exe=$($assetState.HasExe), blockmap=$($assetState.HasBlockmap)) " +
        "tentativa $i/$MaxAttempts$runHint"
      )
      Start-Sleep -Seconds $SleepSeconds
      continue
    }
    if ($releasePageProbe.StatusCode -eq 404) {
      $runInfo = Assert-ReleaseWorkflowHealthy -Owner $Owner -Repo $Repo -Tag $Tag -ApiToken $ApiToken
      $runHint = if ($runInfo) {
        " | workflow status=$($runInfo.status) conclusion=$($runInfo.conclusion)"
      } else {
        ""
      }
      Write-Host "Aguardando release $Tag... tentativa $i/$MaxAttempts$runHint"
      Start-Sleep -Seconds $SleepSeconds
      continue
    }
    if ($releasePageProbe.StatusCode -eq 403) {
      $errorBody = [string]$releasePageProbe.ErrorBody
      if ($errorBody -and $errorBody.ToLowerInvariant() -like "*rate limit*") {
        throw "API rate limit do GitHub atingido e sem token para consulta. Defina GH_TOKEN e rode novamente."
      }
      throw "GitHub retornou 403 ao validar release $Tag. Verifique permissao/token para $Owner/$Repo."
    }
    throw "Falha ao validar release $Tag (status HTTP $($releasePageProbe.StatusCode))."
  }

  return $null
}

try {
  $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
  Set-Location $repoRoot
  Assert-ReleaseBuildAssetsReady

  if ($GitHubToken) {
    $env:GH_TOKEN = $GitHubToken
    $env:GITHUB_TOKEN = $GitHubToken
  } elseif (-not $env:GH_TOKEN -and $env:GITHUB_TOKEN) {
    $env:GH_TOKEN = $env:GITHUB_TOKEN
  } elseif (-not $env:GITHUB_TOKEN -and $env:GH_TOKEN) {
    $env:GITHUB_TOKEN = $env:GH_TOKEN
  }

  $updaterConfigPath = Join-Path $repoRoot "config\updater.json"
  if (-not (Test-Path $updaterConfigPath)) {
    throw "Arquivo config/updater.json nao encontrado."
  }

  $updaterConfig = Get-Content $updaterConfigPath -Raw | ConvertFrom-Json
  $owner = [string]$updaterConfig.owner
  $repo = [string]$updaterConfig.repo
  if (-not $owner -or -not $repo) {
    throw "config/updater.json sem owner/repo. Corrija antes de publicar."
  }

  if ($Mode -eq "local") {
    if ($GitHubToken) {
      $env:GH_TOKEN = $GitHubToken
      $env:GITHUB_TOKEN = $GitHubToken
    }

    if (-not $env:GH_TOKEN -and -not $env:GITHUB_TOKEN) {
      $secureToken = Read-Host "Cole o token do GitHub (PAT com Contents write no repo wplay-update)" -AsSecureString
      $typedToken = Get-PlainTextFromSecureString -SecureValue $secureToken
      if (-not $typedToken) {
        throw "Token vazio. Operacao cancelada."
      }
      $env:GH_TOKEN = $typedToken
      $env:GITHUB_TOKEN = $typedToken
    }

    if (-not $env:GH_TOKEN) {
      $env:GH_TOKEN = $env:GITHUB_TOKEN
    }
    if (-not $env:GITHUB_TOKEN) {
      $env:GITHUB_TOKEN = $env:GH_TOKEN
    }

    Invoke-Step -Title "Validando token no repo $owner/$repo" -Action {
      $headers = @{
        "Authorization" = "Bearer $($env:GH_TOKEN)"
        "User-Agent"    = "WPlay-UpdateNow"
        "Accept"        = "application/vnd.github+json"
      }
      try {
        $repoInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo" -Headers $headers -Method GET
        if ($repoInfo.permissions -and -not $repoInfo.permissions.push) {
          throw "Token sem permissao de escrita no repo."
        }
      } catch {
        throw "Token sem permissao no repo $owner/$repo. Gere PAT com Contents: Read and write."
      }
    }
  } else {
    Write-Host ""
    Write-Host "Modo workflow ativo: sem token local. Publicacao sera feita via GitHub Actions." -ForegroundColor Yellow
  }

  if ($Mode -eq "workflow") {
    Sync-RepositoryBeforeRelease -CommitMessage "chore: sync repo before update release" -PushToRemote $true
  }

  Invoke-Checked -Title "Incrementando versao ($VersionType)" -Command "npm.cmd" -Arguments @("version", $VersionType, "--no-git-tag-version")

  $nextVersion = Get-VersionFromPackageJson
  $tag = "v$nextVersion"

  if ($Mode -eq "local") {
    Invoke-Checked -Title "Publicando release $tag no GitHub (modo local)" -Command "npm.cmd" -Arguments @("run", "release:github")

    Write-Host ""
    Write-Host "Update publicado com sucesso: $tag" -ForegroundColor Green
    Write-Host "Os launchers abertos detectam update em ate ~1 minuto (checkIntervalMinutes=1)." -ForegroundColor Green
    exit 0
  }

  $existingLocalTag = (& git tag --list $tag | Out-String).Trim()
  if ($existingLocalTag) {
    throw "Tag $tag ja existe localmente. Rode novamente apos aumentar versao."
  }

  $existingRemoteTag = (& git ls-remote --tags origin $tag | Out-String).Trim()
  if ($existingRemoteTag) {
    throw "Tag $tag ja existe no remoto. Rode novamente apos aumentar versao."
  }

  Invoke-Checked -Title "Commit da versao $tag" -Command "git" -Arguments @("add", "package.json", "package-lock.json")
  Invoke-Checked -Title "Criando commit release" -Command "git" -Arguments @("commit", "-m", "release: $tag")
  Invoke-Checked -Title "Criando tag $tag" -Command "git" -Arguments @("tag", $tag)
  Invoke-Checked -Title "Enviando branch atual" -Command "git" -Arguments @("push", "origin", "HEAD")
  Invoke-Checked -Title "Enviando tag $tag" -Command "git" -Arguments @("push", "origin", $tag)

  Write-Host ""
  Write-Host "Tag enviada. Aguardando release no GitHub Actions..." -ForegroundColor Yellow
  Write-Host "Actions: https://github.com/$owner/$repo/actions" -ForegroundColor Yellow

  $apiToken = Resolve-GitHubApiToken -ExplicitToken $GitHubToken
  if ($apiToken) {
    try {
      $validateHeaders = New-GitHubApiHeaders -Token $apiToken
      $null = Invoke-RestMethod -Uri "https://api.github.com/rate_limit" -Headers $validateHeaders -Method GET
      Write-Host "Consulta da release via API autenticada." -ForegroundColor DarkCyan
    } catch {
      $statusCode = Get-HttpStatusCodeFromError -ErrorRecord $_
      if ($statusCode -eq 401) {
        Write-Host "Token da API GitHub invalido/expirado. Usando fallback publico da release." -ForegroundColor Yellow
        $apiToken = ""
      } else {
        Write-Host "API autenticada indisponivel no momento. Usando fallback publico da release." -ForegroundColor Yellow
        $apiToken = ""
      }
    }
  }
  if (-not $apiToken) {
    Write-Host "Sem token para API. Usando fallback publico da release." -ForegroundColor DarkCyan
  } else {
    $env:GH_TOKEN = $apiToken
    $env:GITHUB_TOKEN = $apiToken
  }

  $release = Wait-ReleaseByTag -Owner $owner -Repo $repo -Tag $tag -ApiToken $apiToken
  if (-not $release) {
    $runSummary = Get-LatestWorkflowRunSummary -Owner $owner -Repo $repo -ApiToken $apiToken
    $suffix = if ($runSummary) { " | $runSummary" } else { "" }
    throw "Timeout aguardando release $tag no GitHub. Veja: https://github.com/$owner/$repo/actions$suffix"
  }

  $assetNames = @()
  if ($release.PSObject.Properties.Name -contains "resolvedAssetNames") {
    $assetNames = @($release.resolvedAssetNames | ForEach-Object { [string]$_ } | Where-Object { $_ } | Select-Object -Unique)
  } elseif ($release.assets) {
    $assetNames = @($release.assets | ForEach-Object { [string]$_.name } | Where-Object { $_ } | Select-Object -Unique)
  }
  $hasManifest = $assetNames -contains "latest.yml"
  $hasExe = ($assetNames | Where-Object { $_ -match '\.exe$' } | Select-Object -First 1) -ne $null
  $hasBlockmap = ($assetNames | Where-Object { $_ -match '\.blockmap$' } | Select-Object -First 1) -ne $null
  if (-not ($hasManifest -and $hasExe -and $hasBlockmap)) {
    $assetListText = if ($assetNames.Count -gt 0) { $assetNames -join ", " } else { "(nenhum asset visivel ainda)" }
    $runSummary = Get-LatestWorkflowRunSummary -Owner $owner -Repo $repo -ApiToken $apiToken
    $suffix = if ($runSummary) { " | $runSummary" } else { "" }
    throw "Release $tag criada, mas assets incompletos. Esperado: latest.yml + .exe + .blockmap. Encontrado: $assetListText$suffix"
  }

  Write-Host ""
  Write-Host "Update publicado com sucesso: $tag" -ForegroundColor Green
  Write-Host "Release: $($release.html_url)" -ForegroundColor Green
  Write-Host "Os launchers abertos detectam update em ate ~1 minuto (checkIntervalMinutes=1)." -ForegroundColor Green
} catch {
  try {
    if (Test-Path "package.json") {
      $currentVersion = Get-VersionFromPackageJson
      Write-Host "Versao atual no package.json: $currentVersion" -ForegroundColor DarkYellow
    }
  } catch {}
  Write-Error $_.Exception.Message
  exit 1
}
