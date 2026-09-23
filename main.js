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

background("#101820");
noStroke();

fill("#ff6b6b");
circle(-280, -120, 180);

fill("#ffd166");
rect(-90, -120, 180, 140);

fill("#4ecdc4");
triangle(150, 60, 300, -160, 390, 60);

stroke("#f2f4f3");
strokeWeight(10);
line(-440, 180, 440, 180);

console.log("hello world drawn");