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

export async function loadGvWasmModule(customPath = null, options = {}) {
  if (wasmExportsCache) {
    return wasmExportsCache;
  }

  const { debug = false, logger = console } = options;
  const candidates = [];
  if (customPath) {
    candidates.push(toUrl(customPath));
  }
  candidates.push(...moduleCandidates);

  let lastError = null;
  for (const candidate of candidates) {
    try {
      if (debug && typeof logger?.log === 'function') {
        logger.log(`[gv-wasm] loading module: ${candidate.href}`);
      }
      const bytes = await readBinaryFromUrl(candidate);
      if (debug && typeof logger?.log === 'function') {
        logger.log(`[gv-wasm] module bytes: ${bytes.byteLength}`);
        logger.log('[gv-wasm] compiling module synchronously');
      }
      const module = new WebAssembly.Module(bytes);
      if (debug && typeof logger?.log === 'function') {
        logger.log('[gv-wasm] module compiled');
      }
      const imports = WebAssembly.Module.imports(module);
      if (debug && typeof logger?.log === 'function') {
        logger.log('[gv-wasm] module imports:', imports);
      }
      if (imports.length > 0) {
        const importNames = imports.map(({ module, name }) => `${module}.${name}`).join(', ');
        throw new Error(
          `GV WASM is not a raw ABI module; it requires imports: ${importNames}. ` +
          'Rebuild gv-wasm without wasm-bindgen glue and copy the new .wasm file to gv-wasm/gv_wasm.wasm.'
        );
      }
      const instance = new WebAssembly.Instance(module, {});
      wasmExportsCache = instance.exports;
      if (debug && typeof logger?.log === 'function') {
        logger.log(`[gv-wasm] module instantiated; exports: ${Object.keys(wasmExportsCache).join(', ')}`);
      }
      return wasmExportsCache;
    } catch (error) {
      lastError = error;
      if (debug && typeof logger?.warn === 'function') {
        logger.warn(`[gv-wasm] module candidate failed: ${candidate.href}`, error);
      }
    }
  }

  throw new Error(`Failed to load GV WASM module from any candidate path: ${lastError?.message ?? 'unknown error'}`);
}

export async function readGvHeaderFromBuffer(bytes, options = {}) {
  const { debug = false, logger = console, wasmPath = null } = options;
  if (debug && typeof logger?.log === 'function') {
    logger.log(`[gv-wasm] header input bytes: ${bytes.byteLength}`);
    logger.log(`[gv-wasm] requested wasm path: ${wasmPath ?? '(default candidates)'}`);
  }
  const exports = await loadGvWasmModule(wasmPath, { debug, logger });
  if (!exports || typeof exports.read_gv_header !== 'function' ||
      typeof exports.gv_alloc !== 'function' || !exports.memory) {
    throw new Error('GV WASM exports do not expose the raw GV header ABI');
  }

  const inputPtr = exports.gv_alloc(bytes.byteLength);
  const outputPtr = exports.gv_alloc(24);
  if (debug && typeof logger?.log === 'function') {
    logger.log(`[gv-wasm] allocated input=${inputPtr}, output=${outputPtr}`);
  }
  if (!inputPtr || !outputPtr) {
    throw new Error('GV WASM allocation failed');
  }

  try {
    new Uint8Array(exports.memory.buffer, inputPtr, bytes.byteLength).set(bytes);
    if (debug && typeof logger?.log === 'function') {
      logger.log(`[gv-wasm] calling read_gv_header(input=${inputPtr}, length=${bytes.byteLength}, output=${outputPtr})`);
    }
    const status = exports.read_gv_header(inputPtr, bytes.byteLength, outputPtr);
    if (debug && typeof logger?.log === 'function') {
      logger.log(`[gv-wasm] read_gv_header status: ${status}`);
    }
    if (status !== 0) {
      throw new Error(`GV WASM header decode failed with status ${status}`);
    }

    const view = new DataView(exports.memory.buffer, outputPtr, 24);
    const header = {
      width: view.getUint32(0, true),
      height: view.getUint32(4, true),
      frame_count: view.getUint32(8, true),
      fps: view.getFloat32(12, true),
      format: view.getUint32(16, true),
      frame_bytes: view.getUint32(20, true),
    };

    if (debug && typeof logger?.log === 'function') {
      logger.log('[gv-wasm] decoded header object:', header);
    }

    if (debug && typeof logger?.log === 'function') {
      logger.log('[gv-wasm] decoded header:', header);
    }

    return header;
  } finally {
    if (typeof exports.gv_dealloc === 'function') {
      exports.gv_dealloc(inputPtr, bytes.byteLength);
      exports.gv_dealloc(outputPtr, 24);
    }
  }
}

export async function readGvHeaderFromAsset(assetPath, options = {}) {
  const { wasmPath = null } = options;
  const bytes = await readBinaryFromUrl(assetPath);
  return readGvHeaderFromBuffer(bytes, { ...options, wasmPath });
}

export async function readGvFrameCompressedFromBuffer(bytes, frameIndex, header, options = {}) {
  const { debug = false, logger = console, wasmPath = null } = options;
  const exports = await loadGvWasmModule(wasmPath, { debug, logger });
  if (!exports || typeof exports.read_gv_frame_compressed !== 'function' ||
      typeof exports.gv_alloc !== 'function' || !exports.memory) {
    throw new Error('GV WASM exports do not expose the raw frame ABI');
  }

  const outputCapacity = header.frame_bytes;
  const inputPtr = exports.gv_alloc(bytes.byteLength);
  const outputPtr = exports.gv_alloc(outputCapacity);
  if (!inputPtr || !outputPtr) {
    throw new Error('GV WASM frame allocation failed');
  }

  try {
    new Uint8Array(exports.memory.buffer, inputPtr, bytes.byteLength).set(bytes);
    const size = exports.read_gv_frame_compressed(
      inputPtr,
      bytes.byteLength,
      frameIndex,
      outputPtr,
      outputCapacity,
    );
    if (debug && typeof logger?.log === 'function') {
      logger.log(`[gv-wasm] frame ${frameIndex} decode status/size: ${size}`);
    }
    if (size < 0) {
      throw new Error(`GV WASM frame decode failed with status ${size}`);
    }

    return new Uint8Array(exports.memory.buffer, outputPtr, size).slice();
  } finally {
    if (typeof exports.gv_dealloc === 'function') {
      exports.gv_dealloc(inputPtr, bytes.byteLength);
      exports.gv_dealloc(outputPtr, outputCapacity);
    }
  }
}

export async function readGvFrameCompressedFromAsset(assetPath, frameIndex, header, options = {}) {
  const { wasmPath = null } = options;
  const bytes = await readBinaryFromUrl(assetPath);
  return readGvFrameCompressedFromBuffer(bytes, frameIndex, header, { ...options, wasmPath });
}

export async function readGvFrameRgbaFromBuffer(bytes, frameIndex, header, options = {}) {
  const { debug = false, debugFrames = false, logger = console, wasmPath = null } = options;
  const exports = await loadGvWasmModule(wasmPath, { debug, logger });
  if (!exports || typeof exports.read_gv_frame_rgba !== 'function' ||
      typeof exports.gv_alloc !== 'function' || !exports.memory) {
    throw new Error('GV WASM exports do not expose the RGBA frame ABI');
  }

  const outputCapacity = header.width * header.height * 4;
  const inputPtr = exports.gv_alloc(bytes.byteLength);
  const outputPtr = exports.gv_alloc(outputCapacity);
  if (!inputPtr || !outputPtr) {
    throw new Error('GV WASM RGBA frame allocation failed');
  }

  try {
    new Uint8Array(exports.memory.buffer, inputPtr, bytes.byteLength).set(bytes);
    const size = exports.read_gv_frame_rgba(
      inputPtr,
      bytes.byteLength,
      frameIndex,
      outputPtr,
      outputCapacity,
    );
    if (debugFrames && typeof logger?.log === 'function') {
      logger.log(`[gv-wasm] RGBA frame ${frameIndex} decode status/size: ${size}`);
    }
    if (size < 0) {
      throw new Error(`GV WASM RGBA frame decode failed with status ${size}`);
    }

    return new Uint8Array(exports.memory.buffer, outputPtr, size).slice();
  } finally {
    if (typeof exports.gv_dealloc === 'function') {
      exports.gv_dealloc(inputPtr, bytes.byteLength);
      exports.gv_dealloc(outputPtr, outputCapacity);
    }
  }
}

export async function readGvFrameRgbaFromAsset(assetPath, frameIndex, header, options = {}) {
  const { wasmPath = null } = options;
  const bytes = await readBinaryFromUrl(assetPath);
  return readGvFrameRgbaFromBuffer(bytes, frameIndex, header, { ...options, wasmPath });
}

export class GvVideo {
  constructor(bytes, header, wasm, inputPtr, outputPtr, outputCapacity, options = {}) {
    this.bytes = bytes;
    this.header = header;
    this.wasm = wasm;
    this.inputPtr = inputPtr;
    this.outputPtr = outputPtr;
    this.outputCapacity = outputCapacity;
    this.pixelFormat = options.pixelFormat ?? 'bgra8unorm';
    this.wasmPath = options.wasmPath ?? null;
    this.debug = options.debug ?? false;
    this.debugFrames = options.debugFrames ?? false;
    this.logger = options.logger ?? console;
    this.state = 'stopped';
    this.loop = false;
    this.currentFrame = 0;
    this.currentTime = 0;
    this.duration = header.frame_count / header.fps;
    this._startedAt = 0;
    this._pendingFrame = null;
    this._decodedFrame = -1;
  }

  play() {
    if (this.state === 'playing') return;
    this._startedAt = Date.now() - this.currentTime * 1000;
    this.state = 'playing';
  }

  pause() {
    if (this.state === 'playing') this._updateClock();
    this.state = 'paused';
  }

  stop() {
    this.state = 'stopped';
    this.currentTime = 0;
    this.currentFrame = 0;
  }

  seek(seconds) {
    this.currentTime = Math.max(0, Math.min(Number(seconds) || 0, this.duration));
    this.currentFrame = Math.min(
      this.header.frame_count - 1,
      Math.floor(this.currentTime * this.header.fps),
    );
    if (this.state === 'playing') {
      this._startedAt = Date.now() - this.currentTime * 1000;
    }
  }

  setLoop(value) {
    this.loop = Boolean(value);
  }

  _updateClock() {
    if (this.state !== 'playing') return;
    let elapsed = (Date.now() - this._startedAt) / 1000;
    if (elapsed >= this.duration) {
      if (this.loop) {
        elapsed %= this.duration;
        this._startedAt = Date.now() - elapsed * 1000;
      } else {
        this.currentTime = this.duration;
        this.currentFrame = this.header.frame_count - 1;
        this.state = 'stopped';
        return;
      }
    }
    this.currentTime = elapsed;
    this.currentFrame = Math.min(
      this.header.frame_count - 1,
      Math.floor(elapsed * this.header.fps),
    );
  }

  update() {
    this._updateClock();
    if (this._pendingFrame || this.currentFrame === this._decodedFrame) {
      return this._pendingFrame;
    }

    const frameIndex = this.currentFrame;
    this._pendingFrame = Promise.resolve().then(() => {
      const decode = this.pixelFormat === 'bgra8unorm'
        ? this.wasm.read_gv_frame_bgra
        : this.wasm.read_gv_frame_rgba;
      const size = decode(
        this.inputPtr,
        this.bytes.byteLength,
        frameIndex,
        this.outputPtr,
        this.outputCapacity,
      );
      if (this.debugFrames && typeof this.logger?.log === 'function') {
        this.logger.log(`[gv-wasm] RGBA frame ${frameIndex} decode status/size: ${size}`);
      }
      if (size < 0) {
        throw new Error(`GV WASM RGBA frame decode failed with status ${size}`);
      }
      return new Uint8Array(this.wasm.memory.buffer, this.outputPtr, size);
    }).then((frame) => {
      this._decodedFrame = frameIndex;
      this._pendingFrame = null;
      return frame;
    }, (error) => {
      this._pendingFrame = null;
      throw error;
    });

    return this._pendingFrame;
  }

  close() {
    if (!this.wasm) return;
    if (typeof this.wasm.gv_dealloc === 'function') {
      this.wasm.gv_dealloc(this.inputPtr, this.bytes.byteLength);
      this.wasm.gv_dealloc(this.outputPtr, this.outputCapacity);
    }
    this.wasm = null;
    this.inputPtr = 0;
    this.outputPtr = 0;
    this.bytes = null;
  }
}

export async function loadGvVideo(assetPath, options = {}) {
  const bytes = await readBinaryFromUrl(assetPath);
  const wasm = await loadGvWasmModule(options.wasmPath ?? null, options);
  const header = await readGvHeaderFromBuffer(bytes, options);
  const pixelFormat = options.pixelFormat ?? 'bgra8unorm';
  const frameExport = pixelFormat === 'bgra8unorm'
    ? wasm.read_gv_frame_bgra
    : wasm.read_gv_frame_rgba;
  if (typeof frameExport !== 'function' ||
      typeof wasm.gv_alloc !== 'function' || !wasm.memory) {
    throw new Error('GV WASM exports do not expose the persistent RGBA frame ABI');
  }

  const outputCapacity = header.width * header.height * 4;
  const inputPtr = wasm.gv_alloc(bytes.byteLength);
  const outputPtr = wasm.gv_alloc(outputCapacity);
  if (!inputPtr || !outputPtr) {
    throw new Error('GV WASM persistent frame allocation failed');
  }

  new Uint8Array(wasm.memory.buffer, inputPtr, bytes.byteLength).set(bytes);
  return new GvVideo(bytes, header, wasm, inputPtr, outputPtr, outputCapacity, {
    ...options,
    pixelFormat,
  });
}

export function gvWasmModulePath() {
  return copiedWasmUrl.href;
}
