$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$exiftool = Join-Path $root 'path\exiftool-13.45_64\exiftool.exe'
$imagesPath = Join-Path $root 'images'
$outputDir = Join-Path $root 'data'
$outputFile = Join-Path $outputDir 'exif.json'

if (-not (Test-Path $exiftool)) {
  Write-Error "ExifTool not found: $exiftool"
}

if (-not (Test-Path $imagesPath)) {
  Write-Error "Images folder not found: $imagesPath"
}

if (-not (Test-Path $outputDir)) {
  New-Item -Path $outputDir -ItemType Directory | Out-Null
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$json = & $exiftool -json -n -r -ext jpg -ext jpeg -ext png $imagesPath
[System.IO.File]::WriteAllText($outputFile, $json, $utf8NoBom)

Write-Host "Wrote EXIF data to $outputFile"
