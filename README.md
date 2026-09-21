# q5 + Mystral Native

Minimal q5 WebGPU test.

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

## Local build

```powershell
git clone https://github.com/ffunatsu/mystralnative # forked version
C:\vcpkg\vcpkg.exe install curl:x64-windows
cd mystralnative
node scripts/download-deps.mjs
cmake -B build `
  -DCMAKE_TOOLCHAIN_FILE=C:/vcpkg/scripts/buildsystems/vcpkg.cmake `
  -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded `
  -DMYSTRAL_USE_V8=ON -DMYSTRAL_USE_QUICKJS=OFF `
  -DMYSTRAL_USE_DAWN=ON -DMYSTRAL_USE_WGPU=OFF `
  -DMYSTRAL_USE_SWC=OFF
cmake --build build --config Release --parallel

.\mystralnative\build\Release\mystral.exe run bundle-diagnose.js
```
