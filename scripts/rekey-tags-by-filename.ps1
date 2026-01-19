param(
  [string]$ImagesPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'images'),
  [string]$TagsPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'data\\tags\\all-tags.json'),
  [string]$CaptionsPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'data\\captions.json'),
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')

if (-not (Test-Path $ImagesPath)) {
  Write-Error "Images folder not found: $ImagesPath"
}

if (-not (Test-Path $TagsPath)) {
  Write-Error "all-tags.json not found: $TagsPath"
}

$fileMap = @{}
$files = Get-ChildItem -Path $ImagesPath -File | Where-Object {
  $_.Extension -match '\.(jpg|jpeg|png)$'
}
foreach ($file in $files) {
  $relative = $file.FullName.Substring($root.Path.Length + 1).Replace('\', '/')
  $nameKey = $file.Name.ToLower()
  $fileMap[$nameKey] = $relative.ToLower()
}

function Remap-Keys {
  param(
    [object]$InputObject
  )
  $updated = @{}
  $InputObject.PSObject.Properties | ForEach-Object {
    $key = $_.Name
    $value = $_.Value
    $nameKey = ([System.IO.Path]::GetFileName($key)).ToLower()
    if ($fileMap.ContainsKey($nameKey)) {
      $updated[$fileMap[$nameKey]] = $value
    } else {
      $updated[$key] = $value
    }
  }
  return $updated
}

if (-not $DryRun) {
  $rawTags = Get-Content -Path $TagsPath -Raw
  if ($rawTags.Trim()) {
    $tagsObject = $rawTags | ConvertFrom-Json
    $updatedTags = Remap-Keys -InputObject $tagsObject
    $updatedTags | ConvertTo-Json -Depth 6 | Set-Content -Path $TagsPath
  }

  if (Test-Path $CaptionsPath) {
    $rawCaptions = Get-Content -Path $CaptionsPath -Raw
    if ($rawCaptions.Trim()) {
      $captionsObject = $rawCaptions | ConvertFrom-Json
      $captions = @{}
      $captionsObject.PSObject.Properties | ForEach-Object {
        $captions[$_.Name] = $_.Value
      }
      foreach ($pageKey in @($captions.Keys)) {
        if (-not ($captions[$pageKey] -is [psobject])) {
          continue
        }
        $pageMap = Remap-Keys -InputObject $captions[$pageKey]
        $captions[$pageKey] = $pageMap
      }
      $captions | ConvertTo-Json -Depth 6 | Set-Content -Path $CaptionsPath
    }
  }
}

Write-Host "Rekeyed tags and captions using filenames."
