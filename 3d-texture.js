import "./mystral-shim.js";
import "./q5.js";
import "./q5-webgpu-3d.js";
import "./utils.js";

let Canvas = initCanvas;
await Canvas(undefined, undefined, "webgpu");

let width = window.innerWidth;
let height = window.innerHeight;

let pg3d;
let pgTex; // テクスチャ用のオフスクリーンキャンバス

try {
  pg3d = createGraphics(width, height, "3d");
  pgTex = createGraphics(256, 256);
} catch (err) {
  console.error("createGraphics error:", err);
}

// 動的テクスチャの更新（2D キャンバスにチェッカー模様とテキストを描く）
function updateTexture() {
  pgTex.background(30, 40, 60);

  // チェッカーボード
  const s = 32;
  for (let x = 0; x < 256; x += s) {
    for (let y = 0; y < 256; y += s) {
      if (((x / s + y / s) % 2) === 0) {
        pgTex.fill(220, 230, 255);
        pgTex.noStroke();
        pgTex.rect(x, y, s, s);
      }
    }
  }

  // アニメーション円
  pgTex.fill(255, 80, 80);
  pgTex.noStroke();
  let cx = 128 + Math.cos(frameCount * 0.05) * 60;
  let cy = 128 + Math.sin(frameCount * 0.05) * 60;
  pgTex.circle(cx, cy, 50);

  // ラベル
  pgTex.fill(20);
  pgTex.textSize(24);
  pgTex.textAlign(CENTER, CENTER);
  pgTex.text("WebGPU 3D", 128, 128);
}

q5.draw = function () {
  if (!pg3d || !pgTex) return;

  // テクスチャ内容を毎フレーム更新
  updateTexture();

  // 1. 2D 背景
  background("#101018");

  // 2. 3D シーン
  pg3d.clear();
  pg3d.camera(300, -250, 350, 0, 0, 0, 0, 1, 0);
  pg3d.orbitControl(true);

  pg3d.directionalLight(255, 255, 255, 0.5, 0.8, 0.6);
  pg3d.ambientLight(100, 100, 120);

  // テクスチャをバインド
  pg3d.texture(pgTex);

  // A. テクスチャ付き回転ボックス
  pg3d.push();
  pg3d.translate(-90, 0, 0);
  pg3d.rotateX(frameCount * 0.01);
  pg3d.rotateY(frameCount * 0.015);
  pg3d.fill(255, 255, 255);
  pg3d.box(110);
  pg3d.pop();

  // B. テクスチャ付き球体
  pg3d.push();
  pg3d.translate(90, 0, 0);
  pg3d.rotateY(frameCount * 0.02);
  pg3d.fill(255, 255, 255);
  pg3d.sphere(60, 24, 18);
  pg3d.pop();

  // C. テクスチャなし（カラーのみ）の床プレーン
  pg3d.noTexture();
  pg3d.push();
  pg3d.translate(0, 100, 0);
  pg3d.rotateX(Math.PI / 2);
  pg3d.fill(50, 60, 80);
  pg3d.plane(320, 320);
  pg3d.pop();

  // 3D 描画 & 2D 合成
  pg3d.flush();
  imageMode(CENTER);
  image(pg3d, 0, 0, width, height);

  // 3. 2D オーバーレイ & テクスチャプレビュー
  imageMode(CENTER);
  image(pgTex, -width / 2 + 150, height / 2 - 150, 200, 200);

  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  text("q5.js 3D WebGPU - Texture Mapping (texture(img))", 20, 20);
  text("2D Texture Preview (pgTex)", 50, 260);
  text("FPS: " + Math.round(frameRate()), 20, 45);
};
