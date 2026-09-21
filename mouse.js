import "./mystral-shim.js";
import "./q5.js";

await Canvas(1280, 720);

const clicked = [];
let pointerDown = false;

function draw() {
  background("#101820");
  noStroke();

  fill("#4ecdc4");
  circle(mouseX, mouseY, 90);

  fill("#ff6b6b");
  for (const point of clicked) circle(point.x, point.y, 36);

  stroke("#f2f4f3");
  strokeWeight(2);
  line(mouseX - 12, mouseY, mouseX + 12, mouseY);
  line(mouseX, mouseY - 12, mouseX, mouseY + 12);
}

function mousePressed(event) {
  pointerDown = true;
  clicked.push({ x: mouseX, y: mouseY });
  if (clicked.length > 20) clicked.shift();
  console.log("mouse pressed", event.clientX, event.clientY, mouseX, mouseY);
}

function mouseReleased() {
  pointerDown = false;
}

function mouseMoved() {
  if (!pointerDown) draw();
}

function keyPressed(event) {
  console.log("key pressed", event.key, event.code);
  if (event.key.toLowerCase() === "f") {
    if (globalThis.mystral?.toggleFullscreen) {
      globalThis.mystral.toggleFullscreen();
    } else {
      console.log("Mystral fullscreen API is not available");
    }
  }
}

q5.draw = draw;
q5.mousePressed = mousePressed;
q5.mouseReleased = mouseReleased;
q5.mouseMoved = mouseMoved;
q5.keyPressed = keyPressed;

draw();
console.log("mouse example ready");
