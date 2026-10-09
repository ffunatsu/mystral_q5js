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

function openNativeFileStream(value) {
  const url = toUrl(value);
  const open = globalThis.mystral?.openFileStream;
  if (typeof open !== 'function') return null;
  return open(url.href);
}

function readNativeRange(stream, offset, size) {
  if (!stream || typeof stream.readSlice !== 'function') return null;
  return toUint8Array(stream.readSlice(offset, size));
}

function parseGvHeader(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(0, true),
    height: view.getUint32(4, true),
    frame_count: view.getUint32(8, true),
    fps: view.getFloat32(12, true),
    format: view.getUint32(16, true),
    frame_bytes: view.getUint32(20, true),
  };
}

function parseGvEntries(bytes, header) {
  const indexSize = header.frame_count * 16;
  const indexOffset = bytes.byteLength - indexSize;
  const view = new DataView(bytes.buffer, bytes.byteOffset + indexOffset, indexSize);
  const entries = new Array(header.frame_count);
  let inputCapacity = 0;
  for (let i = 0; i < header.frame_count; i++) {
    const offset = i * 16;
    const entry = {
      address: Number(view.getBigUint64(offset, true)),
      size: Number(view.getBigUint64(offset + 8, true)),
    };
    entries[i] = entry;
    inputCapacity = Math.max(inputCapacity, entry.size);
  }
  return { entries, inputCapacity };
}

export function gvCompressedPixelFormat(format) {
  return ({
    1: 'bc1-rgba-unorm',
    3: 'bc2-rgba-unorm',
    5: 'bc3-rgba-unorm',
    7: 'bc7-rgba-unorm',
  })[format] ?? null;
}

function resolvePixelFormat(header, options = {}) {
  if (options.pixelFormat) return options.pixelFormat;
  const compressedFormat = gvCompressedPixelFormat(header.format);
  const supportsCompressed = compressedFormat && options.supportsCompressedTextures === true;
  const preferCompressed = options.preferCompressed ?? supportsCompressed;
  if (preferCompressed && supportsCompressed) {
    return compressedFormat;
  }
  return options.outputFormat ?? 'rgba8unorm';
}

let wasmExportsCache = null;
let configuredWasmPath = null;

export async function initGvWasm(options = {}) {
  if (options.wasmPath !== undefined) {
    configuredWasmPath = options.wasmPath;
  }
  return loadGvWasmModule(configuredWasmPath, options);
}

export async function loadGvWasmModule(customPath = null, options = {}) {
  if (wasmExportsCache) {
    return wasmExportsCache;
  }

  const { debug = false, logger = console } = options;
  const candidates = [];
  const requestedPath = customPath ?? configuredWasmPath;
  if (requestedPath) {
    candidates.push(toUrl(requestedPath));
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
  const stream = openNativeFileStream(assetPath);
  if (stream) {
    try {
      const headerBytes = readNativeRange(stream, 0, 24);
      if (!headerBytes || headerBytes.byteLength !== 24) {
        throw new Error('Failed to read GV header range');
      }
      return parseGvHeader(headerBytes);
    } finally {
      stream.close?.();
    }
  }
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
    this.inputCapacity = options.inputCapacity ?? bytes.byteLength;
    this.entries = options.entries ?? null;
    this.outputPtr = outputPtr;
    this.outputCapacity = outputCapacity;
    this.pixelFormat = options.pixelFormat ?? 'bgra8unorm';
    this.metadata = header;
    this.isCompressed = this.pixelFormat.startsWith('bc');
    this.mode = 'memory';
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
      let size;
      if (this.entries) {
        const entry = this.entries[frameIndex];
        const compressed = this.bytes.subarray(entry.address, entry.address + entry.size);
        new Uint8Array(this.wasm.memory.buffer, this.inputPtr, entry.size).set(compressed);
        if (this.isCompressed) {
          size = this.wasm.read_gv_compressed_frame_data(
            this.inputPtr, entry.size, this.outputPtr, this.outputCapacity,
          );
        } else {
          const decode = this.pixelFormat === 'bgra8unorm'
            ? this.wasm.read_gv_frame_bgra_data
            : this.wasm.read_gv_frame_rgba_data;
          size = decode(
            this.inputPtr,
            entry.size,
            this.header.format,
            this.header.width,
            this.header.height,
            this.outputPtr,
            this.outputCapacity,
          );
        }
      } else {
        const decode = this.isCompressed
          ? this.wasm.read_gv_frame_compressed
          : this.pixelFormat === 'bgra8unorm'
            ? this.wasm.read_gv_frame_bgra
            : this.wasm.read_gv_frame_rgba;
        size = decode(
          this.inputPtr, this.bytes.byteLength, frameIndex,
          this.outputPtr, this.outputCapacity,
        );
      }
      if (this.debugFrames && typeof this.logger?.log === 'function') {
        this.logger.log(`[gv-wasm] ${this.pixelFormat} frame ${frameIndex} decode status/size: ${size}`);
      }
      if (size < 0) {
        throw new Error(`GV WASM ${this.pixelFormat} frame decode failed with status ${size}`);
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

class GvStreamingVideo {
  constructor(stream, header, entries, wasm, inputPtr, inputCapacity, outputPtr, options = {}) {
    this.stream = stream;
    this.header = header;
    this.entries = entries;
    this.wasm = wasm;
    this.inputPtr = inputPtr;
    this.inputCapacity = inputCapacity;
    this.outputPtr = outputPtr;
    this.outputCapacity = options.outputCapacity ?? header.frame_bytes;
    this.pixelFormat = options.pixelFormat;
    this.metadata = header;
    this.isCompressed = this.pixelFormat?.startsWith('bc') ?? false;
    this.mode = 'streaming';
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
    this.currentFrame = Math.min(this.header.frame_count - 1, Math.floor(this.currentTime * this.header.fps));
    if (this.state === 'playing') this._startedAt = Date.now() - this.currentTime * 1000;
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
    this.currentFrame = Math.min(this.header.frame_count - 1, Math.floor(elapsed * this.header.fps));
  }

  update() {
    this._updateClock();
    if (this._pendingFrame || this.currentFrame === this._decodedFrame) return this._pendingFrame;

    const frameIndex = this.currentFrame;
    const entry = this.entries[frameIndex];
    this._pendingFrame = Promise.resolve().then(() => {
      const compressed = readNativeRange(this.stream, entry.address, entry.size);
      if (!compressed || compressed.byteLength !== entry.size) {
        throw new Error(`Failed to read GV frame range ${frameIndex}`);
      }
      new Uint8Array(this.wasm.memory.buffer, this.inputPtr, entry.size).set(compressed);
      let size;
      if (this.isCompressed) {
        size = this.wasm.read_gv_compressed_frame_data(
          this.inputPtr, entry.size, this.outputPtr, this.outputCapacity,
        );
      } else {
        const decode = this.pixelFormat === 'bgra8unorm'
          ? this.wasm.read_gv_frame_bgra_data
          : this.wasm.read_gv_frame_rgba_data;
        size = decode(
          this.inputPtr,
          entry.size,
          this.header.format,
          this.header.width,
          this.header.height,
          this.outputPtr,
          this.outputCapacity,
        );
      }
      if (size < 0) throw new Error(`GV streaming frame decode failed with status ${size}`);
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
    if (this.wasm && typeof this.wasm.gv_dealloc === 'function') {
      this.wasm.gv_dealloc(this.inputPtr, this.inputCapacity);
      this.wasm.gv_dealloc(this.outputPtr, this.outputCapacity);
    }
    this.stream?.close?.();
    this.stream = null;
    this.wasm = null;
  }
}

async function loadStreamingGvVideo(assetPath, options = {}) {
  const logger = options.logger ?? console;
  const stream = openNativeFileStream(assetPath);
  if (!stream || options.streaming === false) {
    if (options.debug && typeof logger.log === 'function') {
      logger.log(
        `[gv-wasm] streaming unavailable: ${options.streaming === false ? 'disabled' : 'native file stream not found'}`
      );
    }
    return null;
  }

  try {
    const headerBytes = readNativeRange(stream, 0, 24);
    if (!headerBytes || headerBytes.byteLength !== 24) throw new Error('Failed to read GV header range');
    const header = parseGvHeader(headerBytes);
    const pixelFormat = resolvePixelFormat(header, options);
    if (options.debug && typeof logger.log === 'function') {
      logger.log(
        `[gv-wasm] streaming source opened: size=${stream.size}, pixelFormat=${pixelFormat}`
      );
    }

    const indexSize = header.frame_count * 16;
    const index = readNativeRange(stream, stream.size - indexSize, indexSize);
    if (!index || index.byteLength !== indexSize) throw new Error('Failed to read GV frame index');
    const view = new DataView(index.buffer, index.byteOffset, index.byteLength);
    const entries = new Array(header.frame_count);
    let inputCapacity = 0;
    for (let i = 0; i < header.frame_count; i++) {
      const offset = i * 16;
      const entry = {
        address: Number(view.getBigUint64(offset, true)),
        size: Number(view.getBigUint64(offset + 8, true)),
      };
      entries[i] = entry;
      inputCapacity = Math.max(inputCapacity, entry.size);
    }

    const wasm = await loadGvWasmModule(options.wasmPath ?? null, options);
    const frameExport = pixelFormat.startsWith('bc')
      ? wasm.read_gv_compressed_frame_data
      : pixelFormat === 'bgra8unorm'
        ? wasm.read_gv_frame_bgra_data
        : wasm.read_gv_frame_rgba_data;
    if (typeof frameExport !== 'function') {
      stream.close?.();
      return null;
    }
    const inputPtr = wasm.gv_alloc(inputCapacity);
    const outputCapacity = pixelFormat.startsWith('bc')
      ? header.frame_bytes
      : header.width * header.height * 4;
    const outputPtr = wasm.gv_alloc(outputCapacity);
    if (!inputPtr || !outputPtr) throw new Error('GV streaming WASM allocation failed');
    return new GvStreamingVideo(stream, header, entries, wasm, inputPtr, inputCapacity, outputPtr, {
      ...options,
      pixelFormat,
      outputCapacity,
    });
  } catch (error) {
    stream.close?.();
    throw error;
  }
}

export async function loadGvVideo(assetPath, options = {}) {
  const streaming = await loadStreamingGvVideo(assetPath, options);
  if (streaming) return streaming;
  const bytes = await readBinaryFromUrl(assetPath);
  const wasm = await loadGvWasmModule(options.wasmPath ?? null, options);
  const header = parseGvHeader(bytes);
  const pixelFormat = resolvePixelFormat(header, options);
  const { entries, inputCapacity } = parseGvEntries(bytes, header);
  const frameExport = pixelFormat.startsWith('bc')
    ? wasm.read_gv_compressed_frame_data
    : pixelFormat === 'bgra8unorm'
      ? wasm.read_gv_frame_bgra_data
      : wasm.read_gv_frame_rgba_data;
  if (typeof frameExport !== 'function' ||
      typeof wasm.gv_alloc !== 'function' || !wasm.memory) {
    throw new Error('GV WASM exports do not expose the persistent RGBA frame ABI');
  }

  const outputCapacity = pixelFormat.startsWith('bc')
    ? header.frame_bytes
    : header.width * header.height * 4;
  const inputPtr = wasm.gv_alloc(inputCapacity);
  const outputPtr = wasm.gv_alloc(outputCapacity);
  if (!inputPtr || !outputPtr) {
    throw new Error('GV WASM persistent frame allocation failed');
  }

  return new GvVideo(bytes, header, wasm, inputPtr, outputPtr, outputCapacity, {
    ...options,
    entries,
    inputCapacity,
    pixelFormat,
  });
}

export function gvWasmModulePath() {
  return copiedWasmUrl.href;
}
