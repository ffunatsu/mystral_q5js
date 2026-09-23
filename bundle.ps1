
param(
  [string]$Name = "main"
)

$Entry = "$Name.js"
$Output = "bundle-$Name.js"

$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot
try {
  npx esbuild $Entry --bundle --outfile=$Output --format=esm --platform=browser
}
finally {
  Pop-Location
}
