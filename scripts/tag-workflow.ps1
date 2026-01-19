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

$tagFiles = Get-ChildItem -Path $DownloadsPath -File -Filter 'tags-*.json'
$allTagsFiles = Get-ChildItem -Path $DownloadsPath -File -Filter 'all-tags*.json'

if ($tagFiles.Count -eq 0 -and $allTagsFiles.Count -eq 0) {
  Write-Host "No tag files found in $DownloadsPath"
} else {
  foreach ($file in $tagFiles) {
    $destPath = Join-Path $TagsPath $file.Name
    Move-Item -Path $file.FullName -Destination $destPath -Force
    Write-Host "Moved $($file.Name) -> $destPath"
  }

  foreach ($file in $allTagsFiles) {
    $destPath = Join-Path $TagsPath 'all-tags.json'
    Move-Item -Path $file.FullName -Destination $destPath -Force
    Write-Host "Moved $($file.Name) -> $destPath"
  }
}

if ($RunBuild) {
  $buildScript = Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'scripts\\build-galleries.js'
  node $buildScript
}
