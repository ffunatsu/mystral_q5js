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
C:\vcpkg\vcpkg.exe install curl:x64-windows
cd refs/mystralnative
node scripts/download-deps.mjs
cmake -B build `
  -DCMAKE_TOOLCHAIN_FILE=C:/vcpkg/scripts/buildsystems/vcpkg.cmake `
  -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded `
  -DMYSTRAL_USE_V8=OFF -DMYSTRAL_USE_QUICKJS=ON `
  -DMYSTRAL_USE_DAWN=OFF -DMYSTRAL_USE_WGPU=ON
cmake --build build --config Release --parallel
```
