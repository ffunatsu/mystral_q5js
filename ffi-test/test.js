function logStage(message) {
  console.log("[ffi-test] " + message);
}

function describeError(error) {
  if (error && error.stack) {
    return error.stack;
  }
  return String(error);
}

try {
  const platform = process.platform;
  const path = "./target/release/mystral_ffi_test";
  logStage("starting");
  logStage("platform: " + platform);
  logStage("library name: " + path);
  logStage("mystral.ffi: " + typeof mystral.ffi);
  logStage("mystral.ffi.open: " + typeof mystral.ffi.open);

  logStage("opening DLL");
  const ffiTest = mystral.ffi.open(path);
  logStage("DLL opened");

  logStage("binding ffi_test_version");
  const version = ffiTest.function("ffi_test_version", "int", []);
  logStage("ffi_test_version bound");

  logStage("binding ffi_test_connect");
  const connect = ffiTest.function(
    "ffi_test_connect",
    "pointer",
    ["string", "int"]
  );
  logStage("ffi_test_connect bound");

  logStage("binding ffi_test_write");
  const write = ffiTest.function(
    "ffi_test_write",
    "int",
    ["pointer", "buffer", "size_t"]
  );
  logStage("ffi_test_write bound");

  logStage("binding ffi_test_close");
  const close = ffiTest.function("ffi_test_close", "void", ["pointer"]);
  logStage("ffi_test_close bound");

  logStage("calling ffi_test_version");
  const apiVersion = version();
  logStage("ffi_test_version returned: " + apiVersion);

  logStage("calling ffi_test_connect");
  const handle = connect("virtual-arduino", 115200);
  logStage("ffi_test_connect returned");
  if (handle === null || handle === undefined) {
    throw new Error("ffi_test_connect returned a null handle");
  }

  try {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    logStage("created Uint8Array, byteLength: " + data.byteLength);
    logStage("calling ffi_test_write");
    const written = write(handle, data, data.byteLength);
    logStage("ffi_test_write returned: " + written);

    logStage("result: " + JSON.stringify({ apiVersion, written }));
    if (apiVersion !== 1 || written !== data.byteLength) {
      throw new Error("Unexpected FFI result");
    }
    logStage("test passed");
  } finally {
    logStage("calling ffi_test_close");
    close(handle);
    logStage("ffi_test_close returned");
  }
} catch (error) {
  console.log("[ffi-test] FAILED");
  console.log("[ffi-test] " + describeError(error));
  throw error;
}
