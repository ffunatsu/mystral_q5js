import "./mystral-shim.js";
import "./q5.js";
import {
  initGvWasm,
  loadGvVideo,
} from "./gv-wasm/loader.mjs";

console.log("GV sample booting");

const CANVAS_W = 1280;
const CANVAS_H = 720;
const ASSET_PATH = "./gv_asset_for_test/alpha-countdown-blue.gv";
const ASSET_URL = new URL(ASSET_PATH, import.meta.url);
const WASM_PATH = "./gv-wasm/gv_wasm.wasm";

console.log("[GV debug] asset path:", ASSET_PATH);
console.log("[GV debug] asset URL:", ASSET_URL.href);
console.log("[GV debug] wasm path:", WASM_PATH);

const gvQ5 = await Q5.WebGPU();
if (!Q5.device || gvQ5._renderer !== "webgpu") {
  throw new Error("GV sample requires a WebGPU renderer");
}
await gvQ5.createCanvas(CANVAS_W, CANVAS_H);
console.log("[GV debug] Canvas ready");
console.log(
  `[GV debug] texture-compression-bc=${Boolean(
    Q5.device?.features?.has?.("texture-compression-bc")
  )}`
);
await initGvWasm({ wasmPath: WASM_PATH, debug: true });

if (window.innerWidth !== CANVAS_W || window.innerHeight !== CANVAS_H) {
  console.error(
    `Canvas/window size mismatch: window is ${window.innerWidth}x${window.innerHeight}, expected ${CANVAS_W}x${CANVAS_H}. Run with --width ${CANVAS_W} --height ${CANVAS_H}.`
  );
  if (typeof process !== "undefined" && typeof process.exit === "function") {
    process.exit(1);
  }
}

const maybeLoadGV = async (path) => {
  const candidates = [
    globalThis.loadGV,
    globalThis.q5?.loadGV,
    globalThis.Q5?.loadGV,
  ];

  for (const fn of candidates) {
    if (typeof fn === "function") {
      return await fn(path);
    }
  }

  return null;
};

const gv = await maybeLoadGV(ASSET_PATH);
console.log("[GV debug] q5 GV loader result:", gv ? Object.keys(gv) : null);
let gvMetadata = null;
let gvFrameImage = null;
let gvPlayer = null;
let appliedFramePromise = null;
let lastFpsLogFrame = -30;
let gvUseCompressedTexture = false;
let gvPixelFormat = "rgba8unorm";
let gvVideoFps = 0;
const gvFrameTimes = [];

function recordGvFrame() {
  const now = Date.now();
  gvFrameTimes.push(now);
  while (gvFrameTimes.length > 1 && now - gvFrameTimes[0] > 2000) {
    gvFrameTimes.shift();
  }
  if (gvFrameTimes.length >= 2) {
    const elapsed = now - gvFrameTimes[0];
    gvVideoFps = elapsed > 0
      ? (gvFrameTimes.length - 1) * 1000 / elapsed
      : 0;
  }
}

try {
  console.log("[GV debug] starting GV player load");
  gvPlayer = await loadGvVideo(ASSET_URL, {
    debug: true,
    supportsCompressedTextures: Boolean(
      globalThis.Q5?.device?.features?.has?.("texture-compression-bc")
    ),
    outputFormat: globalThis.Q5?.device
      ? (globalThis.navigator?.gpu?.getPreferredCanvasFormat?.() ?? "bgra8unorm")
      : "rgba8unorm",
  });
  gvMetadata = gvPlayer.metadata;
  gvUseCompressedTexture = gvPlayer.isCompressed;
  gvPixelFormat = gvPlayer.pixelFormat;
  console.log("GV wasm metadata:", JSON.stringify(gvMetadata, null, 2));
  console.log(`GV asset path: ${ASSET_URL.href}`);
  console.log(`GV wasm path: ${WASM_PATH}`);
  console.log(
    `[GV debug] player mode=${gvPlayer.mode}, ` +
    `pixelFormat=${gvPlayer.pixelFormat}, ` +
    `compressed=${gvPlayer.isCompressed}`
  );
  gvPlayer.setLoop(true);
  gvPlayer.play();
  console.log(
    `[GV debug] player ready: ${gvPlayer.header.frame_count} frames, ` +
    `${gvPlayer.duration}s, loop=${gvPlayer.loop}`
  );

  const frame = await gvPlayer.update();
  console.log(`[GV debug] decoded ${gvPixelFormat} frame bytes: ${frame.byteLength}`);

  gvFrameImage = gvUseCompressedTexture
    ? createCompressedImage(gvMetadata.width, gvMetadata.height, gvPixelFormat)
    : createImage(gvMetadata.width, gvMetadata.height);
  if (gvUseCompressedTexture) {
    gvFrameImage.setCompressedPixels(frame);
  } else if (!gvFrameImage.setExternalPixels?.(frame, gvPixelFormat)) {
    gvFrameImage.loadPixels();
    gvFrameImage.pixels.set(frame);
    gvFrameImage.updatePixels();
  }
  recordGvFrame();
  console.log(
    `[GV debug] q5 image ready: ${gvFrameImage.width}x${gvFrameImage.height}`
  );
} catch (error) {
  console.warn("GV WASM metadata unavailable:", error?.message ?? error);
  console.warn("GV WASM metadata error details:", error?.stack ?? error);
}

q5.draw = () => {
  background("#09141d");

  if (frameCount - lastFpsLogFrame >= 30) {
    lastFpsLogFrame = frameCount;
    console.log(
      `[GV debug] q5 FPS: ${getFPS()} (frameRate: ${frameRate().toFixed(2)}), ` +
      `frame=${gvPlayer?.currentFrame ?? "n/a"}, time=${gvPlayer?.currentTime?.toFixed(3) ?? "n/a"}s`
    );
  }

  if (gvPlayer && gvFrameImage) {
    const framePromise = gvPlayer.update();
    if (framePromise && framePromise !== appliedFramePromise) {
      appliedFramePromise = framePromise;
      framePromise.then((frame) => {
        if (gvUseCompressedTexture) {
          gvFrameImage.setCompressedPixels(frame);
        } else if (!gvFrameImage.setExternalPixels?.(frame, gvPixelFormat)) {
          gvFrameImage.loadPixels();
          gvFrameImage.pixels.set(frame);
          gvFrameImage.updatePixels();
        }
        recordGvFrame();
      }).catch((error) => {
        console.warn("GV frame update failed:", error);
      });
    }
  }

  if (gv && gv.texture) {
    imageMode(CENTER);
    image(gv.texture, 0, 0, width, height);
    drawStatusOverlay();
    return;
  }

  if (gvFrameImage) {
    imageMode(CENTER);
    image(gvFrameImage, 0, 0, width, height);
    drawStatusOverlay();
    return;
  }

  noStroke();
  rectMode(CENTER);
  fill("#0d1d2a");
  rect(0, 0, width, height);

  fill("#8ad0ff");
  rect(0, 0, width * 0.64, height * 0.56);

  fill("#dff7ff");
  rect(0, -height * 0.18, width * 0.6, 6);

  if (gvMetadata) {
    console.log(
      "GV fallback debug:",
      JSON.stringify({
        asset: ASSET_PATH,
        width: gvMetadata.width,
        height: gvMetadata.height,
        frame_count: gvMetadata.frame_count,
        fps: gvMetadata.fps,
        format: gvMetadata.format,
      })
    );
  }
};

function drawStatusOverlay() {
  const x = -width / 2 + 20;
  const y = -height / 2 + 20;
  const fps = Number.isFinite(frameRate()) ? frameRate().toFixed(1) : "n/a";
  const measuredFps = getFPS();
  const videoFps = gvVideoFps > 0 ? gvVideoFps.toFixed(1) : "n/a";
  const targetFps = gvPlayer?.header?.fps ?? "n/a";
  const frame = gvPlayer?.currentFrame ?? "n/a";
  const time = gvPlayer ? gvPlayer.currentTime.toFixed(2) : "n/a";

  push();
  textAlign(LEFT, TOP);
  textSize(18);
  fill("#ffffff");
  text(`video FPS ${videoFps} / target ${targetFps}`, x, y);
  text(`q5 FPS ${fps} (measured ${measuredFps})`, x, y + 24);
  text(`GV frame ${frame} / ${gvPlayer?.header.frame_count ?? "n/a"}`, x, y + 48);
  text(`time ${time}s`, x, y + 72);
  pop();
}

if (gv && typeof gv.play === "function") {
  gv.play();
}

console.log("GV sample ready");
