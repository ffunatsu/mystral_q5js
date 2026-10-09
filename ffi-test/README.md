# Mystral FFI test DLL

A small Rust `cdylib` used to test `mystral.ffi` from a Mystral Native script.
The DLL does not access hardware. It simulates a device handle and returns the
number of bytes passed to `ffi_test_write`.

## Build

Run these commands from this directory:

```powershell
cargo build --release
```

The shared library is created at one of these paths. The test script passes the
base name `./target/release/mystral_ffi_test` to Mystral, which resolves the
platform-specific filename automatically:

```text
Windows: target/release/mystral_ffi_test.dll
macOS:   target/release/libmystral_ffi_test.dylib
Linux:   target/release/libmystral_ffi_test.so
```

## Run with Mystral Native

The example currently uses the relative DLL path
`./target/release/mystral_ffi_test.dll`. Start Mystral from this directory so
that the path resolves correctly:

Windows PowerShell:

```powershell
Push-Location .\ffi-test
..\mystralnative\build\Release\mystral.exe run test.js
Pop-Location
```

macOS/Linux:

```bash
cd ffi-test
../mystralnative/build/mystral run test.js
```

If the current directory is already `ffi-test`, use the platform-specific
command directly:

```powershell
..\mystralnative\build\Release\mystral.exe run test.js
```

```bash
../mystralnative/build/mystral run test.js
```

The current CLI does not pass extra arguments after `test.js` to the script,
so do not append the DLL path to the `mystral run` command yet.

Expected output is similar to:

```text
{"apiVersion":1,"written":3}
```

The runtime opens a graphics window. After confirming the output, close the
window or terminate the process normally. The command's exit code should be
`0`.

If it fails, please report the complete console output and the result of:

```powershell
Get-Location
Test-Path .\target\release\mystral_ffi_test.dll
Test-Path ..\mystralnative\build\Release\mystral.exe
```

The exported functions use a C ABI:

```c
void* ffi_test_connect(const char* port, int baudrate);
int ffi_test_write(void* handle, const void* data, size_t length);
void ffi_test_close(void* handle);
int ffi_test_version(void);
```
