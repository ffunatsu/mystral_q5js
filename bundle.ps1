
param(
  [string]$Name = "main"
)

$Names = @("main", "mouse", "shader", "image", "sound", "diagnose", "gv", "gvs")

$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot
try {
  if ($Name -eq "all") {
    foreach ($n in $Names) {
      npx esbuild "$n.js" --bundle --outfile="bundle-$n.js" --format=esm --platform=browser
    }
  }
  else {
    $Entry = "$Name.js"
    $Output = "bundle-$Name.js"
    npx esbuild $Entry --bundle --outfile=$Output --format=esm --platform=browser
  }
}
finally {
  Pop-Location
}
