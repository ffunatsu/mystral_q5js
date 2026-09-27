import "./mystral-shim.js";
import "./q5.js";
import "./utils.js";

let Canvas = initCanvas;

// ------

// await Canvas();
await Canvas(undefined, undefined, 'webgpu');

let width = window.innerWidth;
let height = window.innerHeight;

let use3d = true;
// let use3d = false;

// console.log("a");
let pg3d;
try {
  pg3d = createGraphics(width, height, '3d');
  // console.log("b");
} catch (err) {
  console.error("createGraphics error:", err);
}

q5.draw = function () {
  if (!pg3d) {
    console.log("error: pg3d undefined");
    return;
  }

  // console.log("yeah!!!");

  // 1. 2D Background
  background("#129620");

  fill(255, 0, 0);
  noStroke();
  circle(100, 100, 50);

  if(use3d){
    // 2. 3D Scene
    pg3d.clear();
    pg3d.orbitControl(true);

    pg3d.directionalLight(255, 240, 200, 0.5, 0.8, 1.0);
    pg3d.ambientLight(100, 100, 120);

    pg3d.push();
    pg3d.rotateX(frameCount * 0.01);
    pg3d.rotateY(frameCount * 0.015);

    // 3D Box
    pg3d.fill(60, 150, 240);
    pg3d.stroke(255, 255, 255);
    pg3d.box(160);

    // Axis Lines
    pg3d.stroke(255, 80, 80);
    pg3d.line(-200, 0, 0, 200, 0, 0);
    pg3d.stroke(80, 255, 80);
    pg3d.line(0, -200, 0, 0, 200, 0);
    pg3d.stroke(80, 120, 255);
    pg3d.line(0, 0, -200, 0, 0, 200);

    pg3d.pop();

    // Submit 3D render pass
    pg3d.flush();

    // Composite 3D layer into 2D canvas
    imageMode(CENTER);
    image(pg3d, 0, 0, width, height);
  }

  // 3. 2D Foreground Overlay (Rendered directly on top)

  fill(255, 0, 0);
  noStroke();
  circle(100, 100, 50);

  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  text("q5.js 3D WebGPU - Basic Box & Layering", 20, 20);
  text("FPS: " + Math.round(frameRate()), 20, 45);
};
