import "./mystral-shim.js";
import "./q5.js";

console.log("before Canvas");
const CANVAS_W = 1280, CANVAS_H = 720;
await Canvas(CANVAS_W, CANVAS_H);

if (window.innerWidth !== CANVAS_W || window.innerHeight !== CANVAS_H) {
  console.error(`Canvas/window size mismatch: window is ${window.innerWidth}x${window.innerHeight}, expected ${CANVAS_W}x${CANVAS_H}. Run with --width ${CANVAS_W} --height ${CANVAS_H}.`);
  process.exit(1);
}
console.log("Canvas ready");

const screenshot = await loadImage("docs/screenshot.png");

console.log("type of screenshot: " + (typeof screenshot));

background("#101820");
imageMode(CENTER);
image(screenshot, 0, 0, 800, 450);

console.log("image example ready", screenshot.width, screenshot.height);
