param(
  [string]$DownloadsPath = (Join-Path $env:USERPROFILE 'Downloads'),
  [string]$TagsPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'data\\tags'),
  [switch]$RunBuild
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $DownloadsPath)) {
  Write-Error "Downloads folder not found: $DownloadsPath"
}

if (-not (Test-Path $TagsPath)) {
  New-Item -Path $TagsPath -ItemType Directory | Out-Null
}

$buildScript = Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'scripts\\build-galleries.js'

Write-Host "Watching $DownloadsPath for tags-*.json"
Write-Host "Moving to $TagsPath"
if ($RunBuild) {
  Write-Host "Auto-build enabled"
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $DownloadsPath
$watcher.Filter = '*tags*.json'
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$onCreated = Register-ObjectEvent $watcher Created -Action {
  $sourcePath = $Event.SourceEventArgs.FullPath
  $fileName = $Event.SourceEventArgs.Name
  if ($fileName -notmatch '^tags-.*\.json$' -and $fileName -notmatch '^all-tags.*\.json$') {
    return
  }
  Write-Host "Detected $fileName"
  $destPath = Join-Path $using:TagsPath $fileName

  for ($i = 0; $i -lt 20; $i++) {
    try {
      $stream = [System.IO.File]::Open($sourcePath, 'Open', 'Read', 'None')
      $stream.Close()
      break
    } catch {
      Start-Sleep -Milliseconds 200
    }
  }

  if (Test-Path $destPath) {
    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    $name = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
    $destPath = Join-Path $using:TagsPath "$name-$timestamp.json"
  }

  Move-Item -Path $sourcePath -Destination $destPath -Force
  Write-Host "Moved $fileName to $destPath"

  if ($using:RunBuild) {
    node $using:buildScript
  }
}

try {
  while ($true) {
    Start-Sleep -Seconds 1
  }
} finally {
  Unregister-Event -SourceIdentifier $onCreated.Name
  $watcher.Dispose()
}
