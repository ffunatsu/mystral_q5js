# q5.js + Mystral Native

<img width="400px" src="docs/screenshot.png">

Minimal [q5.js](https://q5js.org/) sample for [Mystral Native](https://github.com/mystralengine/mystralnative).

The local build uses this [fork](https://github.com/ffunatsu/mystralnative/tree/dev).

This project also includes a locally modified [q5.js implementation](q5.js) for Mystral WebGPU compatibility.

## Bundle and run

```powershell
./bundle.ps1
mystral run bundle.js
```

Diagnostic bundle:

```powershell
./bundle-diagnose.ps1
mystral run bundle-diagnose.js
```

Mouse input example:

```powershell
./bundle-mouse.ps1
mystral run bundle-mouse.js
```

## Mystral Local build

```powershell
git clone --branch dev https://github.com/ffunatsu/mystralnative # forked dev branch
C:\vcpkg\vcpkg.exe install curl:x64-windows
cd mystralnative
# Ensure unzip and 7z are available on PATH.
node scripts/download-deps.mjs
cmake -B build `
  -DCMAKE_TOOLCHAIN_FILE=C:/vcpkg/scripts/buildsystems/vcpkg.cmake `
  -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded `
  -DMYSTRAL_USE_V8=ON -DMYSTRAL_USE_QUICKJS=OFF `
  -DMYSTRAL_USE_DAWN=ON -DMYSTRAL_USE_WGPU=OFF `
  -DMYSTRAL_USE_SWC=OFF
cmake --build build --config Release --parallel
```

then at project root:

```powershell
.\mystralnative\build\Release\mystral.exe run bundle-diagnose.js
```
