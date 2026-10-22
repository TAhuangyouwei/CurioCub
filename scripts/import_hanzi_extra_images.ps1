param([Parameter(Mandatory=$true)][string]$Ffmpeg)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'hanzi-extra-images.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$output = Join-Path $projectRoot 'packages\hanzi-extra\images\hanzi'
New-Item -ItemType Directory -Force -Path $output | Out-Null
Add-Type -AssemblyName System.Drawing
foreach ($asset in $manifest) {
  $target = Join-Path $output $asset.filename
  & $Ffmpeg -y -hide_banner -loglevel error -i $asset.source -vf 'scale=128:128:flags=lanczos' -frames:v 1 -compression_level 9 -pred mixed $target
  if ($LASTEXITCODE -ne 0) { throw "Image import failed: $($asset.filename)" }
  $image = [System.Drawing.Bitmap]::FromFile($target)
  try {
    if ($image.Width -ne 128 -or $image.Height -ne 128 -or ($asset.transparentBackground -and $image.GetPixel(0, 0).A -ne 0)) {
      throw "Invalid size or transparency: $($asset.filename)"
    }
  } finally { $image.Dispose() }
}
$files = Get-ChildItem -LiteralPath $output -Filter '*.png'
Write-Output ("Imported $($files.Count) 128px PNGs; $([math]::Round(($files | Measure-Object Length -Sum).Sum / 1KB, 1)) KiB")
