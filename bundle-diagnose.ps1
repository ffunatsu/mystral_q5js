param(
  [string]$Entry = "diagnose-q5.js",
  [string]$Output = "bundle-diagnose.js"
)

$ErrorActionPreference = "Stop"

npx esbuild $Entry --bundle --outfile=$Output --format=esm --platform=browser