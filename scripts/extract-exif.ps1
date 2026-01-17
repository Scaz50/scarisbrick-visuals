$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$imagesPath = Join-Path $root 'images'
$outputDir = Join-Path $root 'data'
$outputFile = Join-Path $outputDir 'exif.json'

if (-not (Test-Path $imagesPath)) {
  Write-Error "Images folder not found: $imagesPath"
}

if (-not (Test-Path $outputDir)) {
  New-Item -Path $outputDir -ItemType Directory | Out-Null
}

$tagNames = @{
  0x010F = 'Make'
  0x0110 = 'Model'
  0x0132 = 'DateTime'
  0x829A = 'ExposureTime'
  0x829D = 'FNumber'
  0x8827 = 'ISOSpeedRatings'
  0x9003 = 'DateTimeOriginal'
  0x920A = 'FocalLength'
  0xA434 = 'LensModel'
}

function Get-RationalValue {
  param(
    [byte[]]$Bytes,
    [int]$Offset
  )
  $num = [BitConverter]::ToUInt32($Bytes, $Offset)
  $den = [BitConverter]::ToUInt32($Bytes, $Offset + 4)
  if ($den -eq 0) { return $null }
  return [double]$num / [double]$den
}

function Read-ExifValue {
  param(
    [System.Drawing.Imaging.PropertyItem]$Item
  )
  $bytes = $Item.Value
  switch ($Item.Type) {
    2 {
      $value = [System.Text.Encoding]::ASCII.GetString($bytes).Trim([char]0)
      return $value
    }
    3 {
      $values = @()
      for ($i = 0; $i -lt $bytes.Length; $i += 2) {
        $values += [BitConverter]::ToUInt16($bytes, $i)
      }
      if ($values.Count -eq 1) { return $values[0] }
      return $values
    }
    4 {
      $values = @()
      for ($i = 0; $i -lt $bytes.Length; $i += 4) {
        $values += [BitConverter]::ToUInt32($bytes, $i)
      }
      if ($values.Count -eq 1) { return $values[0] }
      return $values
    }
    5 {
      $values = @()
      for ($i = 0; $i -lt $bytes.Length; $i += 8) {
        $values += (Get-RationalValue -Bytes $bytes -Offset $i)
      }
      if ($values.Count -eq 1) { return $values[0] }
      return $values
    }
    7 {
      return ($bytes | ForEach-Object { $_.ToString('X2') }) -join ''
    }
    10 {
      $values = @()
      for ($i = 0; $i -lt $bytes.Length; $i += 8) {
        $num = [BitConverter]::ToInt32($bytes, $i)
        $den = [BitConverter]::ToInt32($bytes, $i + 4)
        if ($den -eq 0) {
          $values += $null
        } else {
          $values += [double]$num / [double]$den
        }
      }
      if ($values.Count -eq 1) { return $values[0] }
      return $values
    }
    default {
      return $bytes
    }
  }
}

$files = Get-ChildItem -Path $imagesPath -Recurse -File | Where-Object {
  $_.Extension -match '\.(jpg|jpeg|png)$'
}

$results = @()

foreach ($file in $files) {
  try {
    $image = [System.Drawing.Image]::FromFile($file.FullName)
    $tags = @()
    $tagMap = @{}

    foreach ($item in $image.PropertyItems) {
      $value = Read-ExifValue -Item $item
      $name = $tagNames[$item.Id]
      $tags += [pscustomobject]@{
        id = ('0x{0:X4}' -f $item.Id)
        name = $name
        type = $item.Type
        value = $value
      }
      if ($name) {
        $tagMap[$name] = $value
      }
    }

    $exposureSeconds = $null
    if ($tagMap.ExposureTime) {
      $exposureSeconds = [double]$tagMap.ExposureTime
    }

    $fNumber = $null
    if ($tagMap.FNumber) {
      $fNumber = [double]$tagMap.FNumber
    }

    $focalLength = $null
    if ($tagMap.FocalLength) {
      $focalLength = [double]$tagMap.FocalLength
    }

    $iso = $null
    if ($tagMap.ISOSpeedRatings) {
      $iso = [int]$tagMap.ISOSpeedRatings
    }

    $relative = $file.FullName.Substring($root.Path.Length + 1).Replace('\', '/')

    $results += [pscustomobject]@{
      file = $relative
      width = $image.Width
      height = $image.Height
      exif = $tagMap
      tags = $tags
      normalized = @{
        make = $tagMap.Make
        model = $tagMap.Model
        lensModel = $tagMap.LensModel
        dateTimeOriginal = $tagMap.DateTimeOriginal
        exposureTimeSeconds = $exposureSeconds
        fNumber = $fNumber
        iso = $iso
        focalLength = $focalLength
      }
    }
  } catch {
    $results += [pscustomobject]@{
      file = $file.FullName.Substring($root.Path.Length + 1).Replace('\', '/')
      error = $_.Exception.Message
    }
  } finally {
    if ($image) {
      $image.Dispose()
    }
  }
}

$results | ConvertTo-Json -Depth 6 | Set-Content -Path $outputFile
Write-Host "Wrote $($results.Count) records to $outputFile"
