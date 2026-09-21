import "./mystral-shim.js";
import "./q5.js";

console.log("before Canvas");
await Canvas(1280, 720);
console.log("Canvas ready");

const screenshot = await loadImage("docs/screenshot.png");

console.log("type of screenshot: " + (typeof screenshot));

background("#101820");
imageMode(CENTER);
image(screenshot, 0, 0, 800, 450);

console.log("image example ready", screenshot.width, screenshot.height);
