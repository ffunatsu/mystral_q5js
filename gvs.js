import "./mystral-shim.js";
import "./q5.js";
import { initGvWasm, loadGvVideo } from "./gv-wasm/loader.mjs";

console.log("GVS sample booting");

const CANVAS_W = 1280;
const CANVAS_H = 720;
const WASM_PATH = "./gv-wasm/gv_wasm.wasm";
const ASSET_PATHS = [
  "./gv_assets_for_test/alpha-countdown-blue.gv",
  "./gv_assets_for_test/alpha-countdown-green.gv",
  "./gv_assets_for_test/alpha-countdown-red.gv",
  "./gv_assets_for_test/alpha-countdown-yellow.gv",
  "./gv_assets_for_test/alpha-countdown.gv",
];

const gvQ5 = await Q5.WebGPU();
if (!Q5.device || gvQ5._renderer !== "webgpu") {
  throw new Error("GVS sample requires a WebGPU renderer");
}
await gvQ5.createCanvas(CANVAS_W, CANVAS_H);

const supportsCompressedTextures = Boolean(
  Q5.device?.features?.has?.("texture-compression-bc")
);
const outputFormat = navigator.gpu?.getPreferredCanvasFormat?.() ?? "bgra8unorm";
console.log(`[GVS debug] assets=${ASSET_PATHS.length}`);
console.log(`[GVS debug] texture-compression-bc=${supportsCompressedTextures}`);
await initGvWasm({ wasmPath: WASM_PATH, debug: true });

const columns = Math.max(1, Math.ceil(Math.sqrt(ASSET_PATHS.length)));
const rows = Math.max(1, Math.ceil(ASSET_PATHS.length / columns));
const cellWidth = CANVAS_W / columns;
const cellHeight = CANVAS_H / rows;
const players = [];
let lastFpsLogFrame = -30;
let appliedFramePromises = new Map();

function uploadFrame(item, frame) {
  if (item.compressed) {
    item.image.setCompressedPixels(frame);
  } else if (!item.image.setExternalPixels?.(frame, item.pixelFormat)) {
    item.image.loadPixels();
    item.image.pixels.set(frame);
    item.image.updatePixels();
  }
}

function drawFit(imageObject, metadata, x, y, w, h) {
  const scale = Math.min(w / metadata.width, h / metadata.height);
  const drawWidth = metadata.width * scale;
  const drawHeight = metadata.height * scale;
  image(imageObject, x + (w - drawWidth) / 2, y + (h - drawHeight) / 2, drawWidth, drawHeight);
}

const loadPlayer = async (assetPath) => {
  const player = await loadGvVideo(new URL(assetPath, import.meta.url), {
    debug: true,
    supportsCompressedTextures,
    outputFormat,
  });
  if (!player) throw new Error(`Failed to load GV: ${assetPath}`);

  player.setLoop(true);
  player.play();
  const frame = await player.update();
  const imageObject = player.isCompressed
    ? createCompressedImage(player.metadata.width, player.metadata.height, player.pixelFormat)
    : createImage(player.metadata.width, player.metadata.height);
  const item = {
    assetPath,
    player,
    image: imageObject,
    metadata: player.metadata,
    pixelFormat: player.pixelFormat,
    compressed: player.isCompressed,
  };
  uploadFrame(item, frame);
  return item;
};

const loadedPlayers = await Promise.all(ASSET_PATHS.map(loadPlayer));
players.push(...loadedPlayers);
console.log(`[GVS debug] grid=${columns}x${rows}, players=${players.length}`);
for (const item of players) {
  console.log(
    `[GVS debug] ready ${item.assetPath}: ` +
    `${item.metadata.width}x${item.metadata.height}, ` +
    `pixelFormat=${item.pixelFormat}, compressed=${item.compressed}`
  );
}

q5.draw = () => {
  background("#09141d");
  imageMode(CORNER);

  if (frameCount - lastFpsLogFrame >= 30) {
    lastFpsLogFrame = frameCount;
    console.log(
      `[GVS debug] q5 FPS: ${getFPS()} ` +
      `(frameRate: ${frameRate().toFixed(2)}), players=${players.length}`
    );
  }

  players.forEach((item, index) => {
    const framePromise = item.player.update();
    if (framePromise && framePromise !== appliedFramePromises.get(item)) {
      appliedFramePromises.set(item, framePromise);
      framePromise.then((frame) => uploadFrame(item, frame)).catch((error) => {
        console.warn(`[GVS] frame update failed: ${item.assetPath}`, error);
      });
    }

    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = -width / 2 + column * cellWidth;
    const y = -height / 2 + row * cellHeight;
    noStroke();
    fill("#102635");
    rect(x, y, cellWidth, cellHeight);
    drawFit(item.image, item.metadata, x, y, cellWidth, cellHeight);
  });

  noStroke();
  fill("#ffffff");
  textSize(18);
  textAlign(CENTER, TOP);
  text(`FPS: ${frameRate().toFixed(1)}`, 0, -height / 2 + 8);
};
