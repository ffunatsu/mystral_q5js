param(
  [string]$Entry = "image.js",
  [string]$Output = "bundle-image.js"
)

$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot
try {
  npx esbuild $Entry --bundle --outfile=$Output --format=esm --platform=browser
}
finally {
  Pop-Location
}
