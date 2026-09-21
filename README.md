# q5.js + Mystral Native

Minimal [q5.js](https://q5js.org/) sample for [Mystral Native](https://github.com/mystralengine/mystralnative).

The local build uses this [fork](https://github.com/ffunatsu/mystralnative).

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

## Mystral Local build

```powershell
git clone https://github.com/ffunatsu/mystralnative # forked version
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