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
let lightMode = 'point'; // 'dir', 'point', 'spot'

q5.keyPressed = function () {
  if (key === '1') lightMode = 'dir';
  if (key === '2') lightMode = 'point';
  if (key === '3') lightMode = 'spot';
};

q5.draw = function () {
  if (!pg3d) return;

  // 1. 2D Background
  background("#12141c");

  // 2. 3D Scene
  pg3d.clear();
  pg3d.orbitControl(true);

  pg3d.ambientLight(30, 30, 45);

  let time = frameCount * 0.03;
  let lightX = Math.cos(time) * 180;
  let lightZ = Math.sin(time) * 180;

  if (lightMode === 'dir') {
    pg3d.directionalLight(255, 230, 190, 1, 1.2, -1);
  } else if (lightMode === 'point') {
    pg3d.pointLight(255, 140, 40, lightX, -90, lightZ);
  } else if (lightMode === 'spot') {
    let spotX = Math.cos(time * 0.5) * 100;
    pg3d.spotLight(80, 220, 255, spotX, -250, 0, 0, 1, 0, Math.PI / 7);
  }

  pg3d.push();

  // Central Big Sphere
  pg3d.push();
  pg3d.fill(220, 220, 235);
  pg3d.noStroke();
  pg3d.sphere(65, 24, 18);
  pg3d.pop();

  // Surrounding Boxes
  for (let i = 0; i < 4; i++) {
    let angle = (i / 4) * Math.PI * 2;
    pg3d.push();
    pg3d.translate(Math.cos(angle) * 140, 20, Math.sin(angle) * 140);
    pg3d.fill(130, 170, 230);
    pg3d.stroke(255, 255, 255);
    pg3d.box(45);
    pg3d.pop();
  }

  // Point light marker
  if (lightMode === 'point') {
    pg3d.push();
    pg3d.translate(lightX, -90, lightZ);
    pg3d.fill(255, 200, 50);
    pg3d.noStroke();
    pg3d.sphere(8, 8, 8);
    pg3d.pop();
  }

  pg3d.pop();

  pg3d.flush();

  // 3. Composite into 2D canvas
  imageMode(CENTER);
  image(pg3d, 0, 0, width, height);

  // 4. 2D Foreground Overlay
  fill(255);
  noStroke();
  textSize(15);
  text("Light Mode: " + lightMode.toUpperCase() + " (Press [1]: Dir, [2]: Point, [3]: Spot)", 20, 30);
  text("FPS: " + Math.round(frameRate()), 20, 55);
};
