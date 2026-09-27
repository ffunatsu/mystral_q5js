
param(
  [string]$Name = "main"
)

$Names = @("main", "mouse", "shader", "image", "sound", "diagnose", "gv", "gvs", "3d-basic", "3d-camera", "3d-lights", "3d-ortho", "3d-mesh", "3d-texture")

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
