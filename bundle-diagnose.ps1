param(
  [string]$Entry = "diagnose-q5.js",
  [string]$Output = "bundle-diagnose.js"
)

$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot
try {
  npx esbuild $Entry --bundle --outfile=$Output --format=esm --platform=browser
}
finally {
  $previousLocation = Get-Location -Stack | Select-Object -First 1
  if ($previousLocation -and (Test-Path $previousLocation.Path)) {
    Pop-Location
  } else {
    Set-Location $PSScriptRoot
  }
}