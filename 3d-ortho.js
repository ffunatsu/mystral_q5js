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

// アイソメトリック（等角投影）カメラ配置
// 斜め上 (400, -400, 400) から原点 (0, 0, 0) を見下ろす
const camDistance = 500;

q5.draw = function () {
  if (!pg3d) return;

  // 1. 2D 背景描画
  background("#1a1a24");

  // 2. 3D シーン描画
  pg3d.clear();

  // 4秒ごとに Ortho と Perspective を切り替え
  let isOrtho = Math.floor(frameCount / 240) % 2 === 0;

  if (isOrtho) {
    // 正射影 (left, right, bottom, top, near, far)
    pg3d.ortho(-width / 2, width / 2, -height / 2, height / 2, -2000, 2000);
  } else {
    // 透視投影 (fovy, aspect, near, far)
    pg3d.perspective(Math.PI / 3, width / height, 10, 5000);
  }

  // カメラ位置（マウスドラッグで回転も可能）
  pg3d.camera(
    camDistance, -camDistance, camDistance, // eye
    0, 0, 0,                               // center
    0, 1, 0                                // up
  );
  pg3d.orbitControl(true);

  // ライティング
  pg3d.directionalLight(255, 255, 255, 0.6, 0.8, -0.5);
  pg3d.ambientLight(80, 80, 100);

  // シーン全体をゆっくり回転
  pg3d.push();
  pg3d.rotateY(frameCount * 0.005);

  // 3x3 のグリッド状にボックスを配置
  const gridSize = 3;
  const spacing = 110;
  const offset = ((gridSize - 1) * spacing) / 2;

  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      pg3d.push();
      let px = x * spacing - offset;
      let pz = z * spacing - offset;
      
      // 高さのアニメーション
      let h = 40 + 30 * Math.sin(frameCount * 0.05 + x + z);
      pg3d.translate(px, -h / 2, pz);

      // 色分け
      let r = 80 + x * 70;
      let g = 130 + z * 50;
      let b = 220;
      pg3d.fill(r, g, b);
      pg3d.stroke(255, 255, 255);
      pg3d.box(70, h, 70);
      pg3d.pop();
    }
  }

  // 座標軸
  pg3d.stroke(255, 60, 60);
  pg3d.line(-200, 0, 0, 200, 0, 0); // X (赤)
  pg3d.stroke(60, 255, 60);
  pg3d.line(0, -200, 0, 0, 200, 0); // Y (緑)
  pg3d.stroke(60, 100, 255);
  pg3d.line(0, 0, -200, 0, 0, 200); // Z (青)

  pg3d.pop();

  // 3D 描画の実行
  pg3d.flush();

  // 2D キャンバスへ合成
  imageMode(CENTER);
  image(pg3d, 0, 0, width, height);

  // 3. 2D オーバーレイ情報表示
  fill(255);
  noStroke();
  textSize(18);
  textAlign(LEFT, TOP);
  text("q5.js 3D WebGPU - Orthographic vs Perspective", 20, 20);
  
  textSize(14);
  fill(isOrtho ? "#55ff88" : "#88aaff");
  text(`Projection Mode: ${isOrtho ? "ORTHOGRAPHIC (平行投影)" : "PERSPECTIVE (透視投影)"}`, 20, 50);
  
  fill(200);
  text(`Switching in: ${4 - (Math.floor(frameCount / 60) % 4)}s`, 20, 72);
  text(`FPS: ${Math.round(frameRate())}`, 20, 94);
};