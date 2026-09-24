import "./mystral-shim.js";
import "./q5.js";
import { readGvHeaderFromAsset } from "./gv-wasm/loader.mjs";

console.log("GV sample booting");

const CANVAS_W = 1280;
const CANVAS_H = 720;
const ASSET_PATH = "./gv_asset_for_test/alpha-countdown-blue.gv";
const ASSET_URL = new URL(ASSET_PATH, import.meta.url);
const WASM_PATH = "./gv-wasm/gv_wasm.wasm";

await Canvas(CANVAS_W, CANVAS_H);

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
let gvMetadata = null;

try {
  gvMetadata = await readGvHeaderFromAsset(ASSET_URL, {
    debug: true,
    wasmPath: WASM_PATH,
  });
  console.log("GV wasm metadata:", JSON.stringify(gvMetadata, null, 2));
  console.log(`GV asset path: ${ASSET_URL.href}`);
  console.log(`GV wasm path: ${WASM_PATH}`);
} catch (error) {
  console.warn("GV WASM metadata unavailable:", error);
}

q5.draw = () => {
  background("#09141d");

  if (gv && gv.texture) {
    imageMode(CENTER);
    image(gv.texture, 0, 0, width, height);
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

if (gv && typeof gv.play === "function") {
  gv.play();
}

console.log("GV sample ready");
