# Mystral FFI (Experimental Fork)

Mystral Native provides a small runtime FFI for calling functions exported by a shared library from V8 JavaScript. The library can be added or replaced without rebuilding Mystral.

V8 builds on Windows, macOS, and Linux are supported. Use `.dll` on Windows, `.dylib` on macOS, and `.so` on Linux. Functions must use a stable C ABI; do not expose C++ classes, STL types, or exceptions across the library boundary.

## JavaScript API

```js
const arduino = mystral.ffi.open("arduino");

const connect = arduino.function(
  "arduino_connect",
  "pointer",
  ["string", "int"]
);

const write = arduino.function(
  "arduino_write",
  "int",
  ["pointer", "buffer", "size_t"]
);

const close = arduino.function("arduino_close", "void", ["pointer"]);

const handle = connect("COM3", 115200);
const data = new Uint8Array([0x01, 0x02, 0x03]);

const written = write(handle, data, data.byteLength);
close(handle);
```

`pointer` return values are represented as opaque V8 external values. A `buffer` argument accepts an `ArrayBufferView`, including `Uint8Array`, and passes its byte address to the native function. The buffer must remain valid while the synchronous call is running.

`open()` accepts a library name without an extension and resolves the platform-specific filename automatically. For example, `arduino` resolves to `arduino.dll` on Windows, `libarduino.dylib` on macOS, and `libarduino.so` on Linux. Explicit filenames such as `arduino.dll` are also accepted.

## Native library

Export functions with `extern "C"` and define ownership explicitly:

```cpp
extern "C" {

void* arduino_connect(const char* port, int baudrate);
int arduino_write(void* handle, const void* data, size_t length);
void arduino_close(void* handle);

}
```

The code that allocates a native handle should also provide the function that releases it. Do not return memory allocated by one CRT and free it from another module.

## Current supported calls

The current implementation supports these call shapes:

- No arguments with `void`, `int`, `size_t`, or `pointer` return values
- `string, int` arguments with a `pointer` return value
- `pointer, buffer, size_t` arguments with an `int` return value
- `pointer` argument with a `void` return value

Other signatures, structures, callbacks, asynchronous calls, and arbitrary C++ APIs are not supported yet.

## Rust DLL example

The repository contains a dependency-free Rust `cdylib` test project in [`ffi-test`](../ffi-test/). The test uses the base library name `./target/release/mystral_ffi_test`; the runtime resolves the platform-specific prefix and extension. Build and run it from the project root:

Windows PowerShell:

```powershell
cargo build --release --manifest-path .\ffi-test\Cargo.toml
Push-Location .\ffi-test
..\mystralnative\build\Release\mystral.exe run test.js
Pop-Location
```

macOS/Linux:

```bash
cargo build --release --manifest-path ./ffi-test/Cargo.toml
cd ffi-test
../mystralnative/build/mystral run test.js
```

The example uses a relative DLL path and should report:

```text
{"apiVersion":1,"written":3}
[ffi-test] test passed
```
