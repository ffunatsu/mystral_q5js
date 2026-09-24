const copiedWasmUrl = new URL('./gv_wasm.wasm', import.meta.url);
const fallbackWasmUrl = new URL('./target/wasm32-unknown-unknown/release/gv_wasm.wasm', import.meta.url);
const moduleCandidates = [copiedWasmUrl, fallbackWasmUrl];

function toUrl(value) {
  if (value instanceof URL) return value;
  if (typeof value === 'string') {
    if (value.startsWith('file://') || value.startsWith('http://') || value.startsWith('https://')) {
      return new URL(value);
    }
    return new URL(value, import.meta.url);
  }
  throw new TypeError('Expected URL or string path');
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (value && typeof value.byteLength === 'number') {
    return new Uint8Array(value);
  }
  throw new TypeError('Unsupported binary payload type');
}

async function readBinaryFromUrl(value) {
  const url = toUrl(value);

  if (typeof __readFileSync === 'function') {
    const raw = __readFileSync(url.href);
    if (raw !== null && raw !== undefined) {
      return toUint8Array(raw);
    }
  }

  if (typeof fetch === 'function') {
    const response = await fetch(url.href);
    if (!response || !response.ok) {
      throw new Error(`Failed to fetch: ${url.href}`);
    }
    const buffer = await response.arrayBuffer();
    return toUint8Array(buffer);
  }

  throw new Error('No supported binary loader available in this runtime. Expected fetch() or __readFileSync().');
}

let wasmExportsCache = null;

export async function loadGvWasmModule(customPath = null) {
  if (wasmExportsCache) {
    return wasmExportsCache;
  }

  const candidates = [];
  if (customPath) {
    candidates.push(toUrl(customPath));
  }
  candidates.push(...moduleCandidates);

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const bytes = await readBinaryFromUrl(candidate);
      const wasm = await WebAssembly.instantiate(bytes, {});
      wasmExportsCache = wasm.instance.exports;
      return wasmExportsCache;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Failed to load GV WASM module from any candidate path: ${lastError?.message ?? 'unknown error'}`);
}

export async function readGvHeaderFromBuffer(bytes, options = {}) {
  const { debug = false, logger = console, wasmPath = null } = options;
  const exports = await loadGvWasmModule(wasmPath);
  if (!exports || typeof exports.read_gv_header !== 'function') {
    throw new Error('GV WASM exports do not expose read_gv_header');
  }

  const header = exports.read_gv_header(bytes);
  const result = {
    width: header.width,
    height: header.height,
    frame_count: header.frame_count,
    fps: header.fps,
    format: header.format,
    frame_bytes: header.frame_bytes,
  };

  if (debug && typeof logger?.log === 'function') {
    logger.log('[gv-wasm] decoded header:', result);
  }

  return result;
}

export async function readGvHeaderFromAsset(assetPath, options = {}) {
  const { wasmPath = null } = options;
  const bytes = await readBinaryFromUrl(assetPath);
  return readGvHeaderFromBuffer(bytes, { ...options, wasmPath });
}

export function gvWasmModulePath() {
  return copiedWasmUrl.href;
}
