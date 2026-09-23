# q5.js + Mystral Native

<img width="400px" src="docs/screenshot.png">

Minimal [q5.js](https://q5js.org/) sample for [Mystral Native](https://github.com/mystralengine/mystralnative).

The local build uses this [fork](https://github.com/ffunatsu/mystralnative/tree/dev).

This project also includes a locally modified [q5.js implementation](q5.js) for Mystral WebGPU compatibility.

## Bundle and run (examples)

```bash 
.\bundle.ps1 # Windows
bash ./bundle.sh # macOS

mystral run bundle-main.js
```

Diagnostic bundle:

```text
.\bundle.ps1 diagnose     # Windows
bash ./bundle.sh diagnose # macOS
mystral run bundle-diagnose.js
```

## More examples

```text
.\bundle.ps1 mouse        # Windows
bash ./bundle.sh mouse    # macOS
mystral run bundle-mouse.js

.\bundle.ps1 image        # Windows
bash ./bundle.sh image    # macOS
mystral run bundle-image.js
```

## Mystral Local build

```bash
git submodule update --init --recursive
cd mystralnative
# make sure unzip and 7zip commands available on PATH
node scripts/download-deps.mjs
```

Windows (PowerShell):

```powershell
C:\vcpkg\vcpkg.exe install curl:x64-windows
cmake -B build `
  -DCMAKE_TOOLCHAIN_FILE=C:/vcpkg/scripts/buildsystems/vcpkg.cmake `
  -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded `
  -DMYSTRAL_USE_V8=ON -DMYSTRAL_USE_QUICKJS=OFF `
  -DMYSTRAL_USE_DAWN=ON -DMYSTRAL_USE_WGPU=OFF `
  -DMYSTRAL_USE_SWC=OFF
cmake --build build --config Release --parallel
```

macOS:

```bash
cmake -B build \
  -DMYSTRAL_USE_V8=ON -DMYSTRAL_USE_QUICKJS=OFF \
  -DMYSTRAL_USE_DAWN=ON -DMYSTRAL_USE_WGPU=OFF \
  -DMYSTRAL_USE_SWC=OFF
cmake --build build --config Release --parallel
```

Then, from the project root:

Windows:

```powershell
.\mystralnative\build\Release\mystral.exe run bundle-diagnose.js
```

macOS:

```bash
./mystralnative/build/mystral run bundle-diagnose.js
```
