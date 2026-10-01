import "./mystral-shim.js";
import "./q5.js";
import "./q5-webgpu-3d.js";
import "./utils.js";

let Canvas = initCanvas;

// ------

await Canvas();

let width = window.innerWidth;
let height = window.innerHeight;

let pg3d = createGraphics(width, height, '3d');
let isOrthoMode = false;
let cameraMode = 0;

function updateProjection() {
  if (!pg3d) return;
  if (isOrthoMode) {
    let hw = width / 2;
    let hh = height / 2;
    pg3d.ortho(-hw, hw, -hh, hh, -2000, 2000);
  } else {
    pg3d.perspective(Math.PI / 3, width / height, 0.1, 5000);
  }
}

updateProjection();

q5.keyPressed = function () {
  if (key === ' ' || keyCode === 32) {
    isOrthoMode = !isOrthoMode;
    updateProjection();
  }
  if (key === 'c' || key === 'C') {
    cameraMode = (cameraMode + 1) % 3;
    if (cameraMode === 0) pg3d.camera(0, -100, 500, 0, 0, 0, 0, 1, 0);
    else if (cameraMode === 1) pg3d.camera(350, -350, 350, 0, 0, 0, 0, 1, 0);
    else if (cameraMode === 2) pg3d.camera(0, -600, 1, 0, 0, 0, 0, 0, -1);
  }
};

q5.draw = function () {
  if (!pg3d) return;

  // 1. 2D Background
  background("#181a24");

  // 2. 3D Graphics
  pg3d.clear();
  pg3d.orbitControl(true);

  pg3d.directionalLight(255, 235, 200, 1, 1.5, -1);
  pg3d.ambientLight(60, 60, 80);

  // Coordinate Axis
  pg3d.strokeWeight(1);
  pg3d.stroke(255, 80, 80); pg3d.line(-200, 0, 0, 200, 0, 0);
  pg3d.stroke(80, 255, 80); pg3d.line(0, -200, 0, 0, 200, 0);
  pg3d.stroke(80, 120, 255); pg3d.line(0, 0, -200, 0, 0, 200);

  pg3d.push();
  pg3d.rotateY(frameCount * 0.01);

  // Left Box
  pg3d.push();
  pg3d.translate(-90, 0, 0);
  pg3d.fill(60, 150, 240);
  pg3d.stroke(255, 255, 255);
  pg3d.box(100);
  pg3d.pop();

  // Right Sphere
  pg3d.push();
  pg3d.translate(90, 0, 0);
  pg3d.fill(240, 120, 80);
  pg3d.noStroke();
  pg3d.sphere(55, 20, 16);
  pg3d.pop();

  pg3d.pop();

  pg3d.flush();

  // 3. Composite into 2D Canvas (Center Aligned)
  imageMode(CENTER);
  image(pg3d, 0, 0, width, height);

  // 4. 2D UI Overlay
  fill(255);
  noStroke();
  textSize(15);
  textAlign(LEFT, TOP);
  text("Projection: " + (isOrthoMode ? "ORTHOGRAPHIC" : "PERSPECTIVE") + " (Press [Space] to toggle)", -width / 2 + 20, -height / 2 + 20);
  text("Camera Preset: " + ["Front", "Isometric", "Top-Down"][cameraMode] + " (Press [C] to cycle)", -width / 2 + 20, -height / 2 + 45);
  text("FPS: " + Math.round(frameRate()), -width / 2 + 20, -height / 2 + 70);
};
