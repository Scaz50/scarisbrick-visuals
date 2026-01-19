param(
  [string]$ImagesPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'images'),
  [string]$TagsPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'data\\tags\\all-tags.json'),
  [string]$CaptionsPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) 'data\\captions.json'),
  [switch]$RunBuild,
  [switch]$RunExif,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$imagesRoot = Resolve-Path $ImagesPath

if (-not (Test-Path $imagesRoot)) {
  Write-Error "Images folder not found: $imagesRoot"
}

$files = Get-ChildItem -Path $imagesRoot -Recurse -File | Where-Object {
  $_.Extension -match '\.(jpg|jpeg|png)$'
}

$mapping = @{}

function Get-UniqueTarget {
  param(
    [string]$BasePath
  )
  if (-not (Test-Path $BasePath)) {
    return $BasePath
  }
  $dir = Split-Path -Parent $BasePath
  $name = [System.IO.Path]::GetFileNameWithoutExtension($BasePath)
  $ext = [System.IO.Path]::GetExtension($BasePath)
  $i = 1
  while ($true) {
    $candidate = Join-Path $dir "$name-$i$ext"
    if (-not (Test-Path $candidate)) {
      return $candidate
    }
    $i += 1
  }
}

foreach ($file in $files) {
  $oldRelative = $file.FullName.Substring($root.Path.Length + 1).Replace('\', '/')
  $oldKey = $oldRelative.ToLower()
  $target = Join-Path $imagesRoot ([System.IO.Path]::GetFileName($file.FullName))
  if ($file.FullName -ieq $target) {
    $mapping[$oldKey] = $oldKey
    continue
  }

  $target = Get-UniqueTarget -BasePath $target
  $newRelative = $target.Substring($root.Path.Length + 1).Replace('\', '/')
  $mapping[$oldKey] = $newRelative.ToLower()

  if (-not $DryRun) {
    Move-Item -Path $file.FullName -Destination $target
  } else {
    Write-Host "Would move $oldRelative -> $newRelative"
  }
}

if (-not $DryRun) {
  if (Test-Path $TagsPath) {
    $rawTags = Get-Content -Path $TagsPath -Raw
    if ($rawTags.Trim()) {
      $tagsObject = $rawTags | ConvertFrom-Json
      $updatedTags = @{}
      $tagsObject.PSObject.Properties | ForEach-Object {
        $key = $_.Name
        $value = $_.Value
        $lower = $key.ToLower()
        if ($mapping.ContainsKey($lower)) {
          $updatedTags[$mapping[$lower]] = $value
        } else {
          $updatedTags[$key] = $value
        }
      }
      $updatedTags | ConvertTo-Json -Depth 6 | Set-Content -Path $TagsPath
    }
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
        $pageMap = $captions[$pageKey]
        $updated = @{}
        $pageMap.PSObject.Properties | ForEach-Object {
          $key = $_.Name
          $value = $_.Value
          $lower = $key.ToLower()
          if ($mapping.ContainsKey($lower)) {
            $updated[$mapping[$lower]] = $value
          } else {
            $updated[$key] = $value
          }
        }
        $captions[$pageKey] = $updated
      }
      $captions | ConvertTo-Json -Depth 6 | Set-Content -Path $CaptionsPath
    }
  }
}

if ($RunExif -and -not $DryRun) {
  $exifToolScript = Join-Path $root 'scripts\\extract-exiftool.ps1'
  $exifScript = Join-Path $root 'scripts\\extract-exif.ps1'
  if (Test-Path $exifToolScript) {
    & $exifToolScript
  } elseif (Test-Path $exifScript) {
    & $exifScript
  }
}

if ($RunBuild -and -not $DryRun) {
  $buildScript = Join-Path $root 'scripts\\build-galleries.js'
  node $buildScript
}
