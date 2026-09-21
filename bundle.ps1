param(
  [string]$Entry = "main.js",
  [string]$Output = "bundle.js"
)

$ErrorActionPreference = "Stop"

npx esbuild $Entry --bundle --outfile=$Output --format=esm --platform=browser