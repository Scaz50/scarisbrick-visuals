param(
  [string]$ImagesPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'images'),
  [string]$TagsPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'data\\tags\\all-tags.json'),
  [switch]$RunBuild
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$tagsDir = Split-Path -Parent $TagsPath

if (-not (Test-Path $ImagesPath)) {
  Write-Error "Images folder not found: $ImagesPath"
}

if (-not (Test-Path $tagsDir)) {
  New-Item -Path $tagsDir -ItemType Directory | Out-Null
}

$exifToolScript = Join-Path $root 'scripts\\extract-exiftool.ps1'
$exifScript = Join-Path $root 'scripts\\extract-exif.ps1'
if (Test-Path $exifToolScript) {
  & $exifToolScript
} elseif (Test-Path $exifScript) {
  & $exifScript
}

$allTags = @{}
if (Test-Path $TagsPath) {
  $raw = Get-Content -Path $TagsPath -Raw
  if ($raw.Trim()) {
    $convertCmd = Get-Command ConvertFrom-Json
    if ($convertCmd.Parameters.ContainsKey('AsHashtable')) {
      $allTags = $raw | ConvertFrom-Json -AsHashtable
    } else {
      $parsed = $raw | ConvertFrom-Json
      $allTags = @{}
      foreach ($entry in $parsed.PSObject.Properties) {
        $allTags[$entry.Name] = $entry.Value
      }
    }
  }
}

$files = Get-ChildItem -Path $ImagesPath -Recurse -File | Where-Object {
  $_.Extension -match '\.(jpg|jpeg|png)$'
}

$added = 0
foreach ($file in $files) {
  $relative = $file.FullName.Substring($root.Path.Length + 1).Replace('\', '/').ToLower()
  if (-not $relative.StartsWith('images/')) {
    continue
  }
  if (-not $allTags.ContainsKey($relative)) {
    $allTags[$relative] = @('All')
    $added += 1
  }
}

$allTags | ConvertTo-Json -Depth 6 | Set-Content -Path $TagsPath
Write-Host "Added $added images to $TagsPath"

if ($RunBuild) {
  $buildScript = Join-Path $root 'scripts\\build-galleries.js'
  node $buildScript
}
