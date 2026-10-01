import "./mystral-shim.js";
import "./q5.js";
import "./q5-webgpu-3d.js";
import "./utils.js";

let Canvas = initCanvas;
await Canvas(undefined, undefined, "webgpu");

let width = window.innerWidth;
let height = window.innerHeight;

let pg3d;
try {
  pg3d = createGraphics(width, height, "3d");
} catch (err) {
  console.error("createGraphics error:", err);
}

// 1. Dynamic Mesh: プロシージャル波面グリッド
const gridCols = 20;
const gridRows = 20;
const cellSize = 18;
const halfW = ((gridCols - 1) * cellSize) / 2;
const halfH = ((gridRows - 1) * cellSize) / 2;

const numVerts = gridCols * gridRows;
const positions = new Float32Array(numVerts * 3);
const uvs = new Float32Array(numVerts * 2);
const indices = [];

// インデックスと UV の初期構築
for (let y = 0; y < gridRows; y++) {
  for (let x = 0; x < gridCols; x++) {
    const idx = y * gridCols + x;
    uvs[idx * 2 + 0] = x / (gridCols - 1);
    uvs[idx * 2 + 1] = y / (gridRows - 1);

    if (x < gridCols - 1 && y < gridRows - 1) {
      const i0 = y * gridCols + x;
      const i1 = y * gridCols + (x + 1);
      const i2 = (y + 1) * gridCols + (x + 1);
      const i3 = (y + 1) * gridCols + x;

      // 2 Triangles per quad
      indices.push(i0, i1, i2);
      indices.push(i0, i2, i3);
    }
  }
}

// Mesh オブジェクトの生成
const waveMesh = pg3d.createMesh({
  positions: positions,
  uvs: uvs,
  indices: new Uint16Array(indices)
});

q5.draw = function () {
  if (!pg3d) return;

  // 1. 2D 背景
  background("#14141e");

  // 2. 3D シーン
  pg3d.clear();
  pg3d.camera(350, -300, 350, 0, 0, 0, 0, 1, 0);
  pg3d.orbitControl(true);

  pg3d.directionalLight(255, 240, 220, 0.6, 0.8, 0.4);
  pg3d.ambientLight(70, 70, 90);

  // --- A. Dynamic Mesh（毎フレーム頂点高さを更新 & 法線を再計算） ---
  const time = frameCount * 0.04;
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      const idx = (y * gridCols + x) * 3;
      const px = x * cellSize - halfW;
      const pz = y * cellSize - halfH;
      const dist = Math.hypot(px, pz);
      const py = Math.sin(dist * 0.05 - time) * 30 + Math.cos(x * 0.3 + time) * 10;

      positions[idx + 0] = px;
      positions[idx + 1] = py;
      positions[idx + 2] = pz;
    }
  }
  // 法線の再計算（ライティングが波に合わせてリアルタイム追従）
  waveMesh.setPositions(positions).computeNormals();

  pg3d.push();
  pg3d.translate(0, 40, 0);
  pg3d.fill(60, 140, 240);
  pg3d.drawMesh(waveMesh);
  pg3d.pop();

  // --- B. beginShape / vertex / endShape によるカスタム多面体 ---
  pg3d.push();
  pg3d.translate(0, -120, 0);
  pg3d.rotateY(frameCount * 0.02);
  pg3d.rotateX(frameCount * 0.015);

  pg3d.fill(240, 180, 50);
  pg3d.stroke(255, 255, 255);

  // ピラミッド（四角錐）を手動で構築
  const s = 40, h = 50;
  pg3d.beginShape(TRIANGLES);
  // 面 1
  pg3d.normal(0, 0.7, 0.7);
  pg3d.vertex(0, -h, 0, 0.5, 1);
  pg3d.vertex(-s, 0, s, 0, 0);
  pg3d.vertex(s, 0, s, 1, 0);
  // 面 2
  pg3d.normal(0.7, 0.7, 0);
  pg3d.vertex(0, -h, 0, 0.5, 1);
  pg3d.vertex(s, 0, s, 0, 0);
  pg3d.vertex(s, 0, -s, 1, 0);
  // 面 3
  pg3d.normal(0, 0.7, -0.7);
  pg3d.vertex(0, -h, 0, 0.5, 1);
  pg3d.vertex(s, 0, -s, 0, 0);
  pg3d.vertex(-s, 0, -s, 1, 0);
  // 面 4
  pg3d.normal(-0.7, 0.7, 0);
  pg3d.vertex(0, -h, 0, 0.5, 1);
  pg3d.vertex(-s, 0, -s, 0, 0);
  pg3d.vertex(-s, 0, s, 1, 0);
  pg3d.endShape();

  pg3d.pop();

  // 描画実行 & 2D 合成
  pg3d.flush();
  imageMode(CENTER);
  image(pg3d, 0, 0, width, height);

  // 3. 2D オーバーレイ
  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  text("q5.js 3D WebGPU - Dynamic Mesh & beginShape()", 20, 20);
  textSize(13);
  fill(180);
  text(`Wave Grid: ${gridCols}x${gridRows} vertices (${indices.length / 3} triangles)`, 20, 45);
  text("FPS: " + Math.round(frameRate()), 20, 68);
};
