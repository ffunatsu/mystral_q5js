import "./mystral-shim.js";
import "./q5.js";

const CANVAS_W = 1280, CANVAS_H = 720;
await Canvas(CANVAS_W, CANVAS_H);

if (window.innerWidth !== CANVAS_W || window.innerHeight !== CANVAS_H) {
  console.error(`Canvas/window size mismatch: window is ${window.innerWidth}x${window.innerHeight}, expected ${CANVAS_W}x${CANVAS_H}. Run with --width ${CANVAS_W} --height ${CANVAS_H}.`);
  process.exit(1);
}

let wobble = createShader(`
@vertex
fn vertexMain(v: VertexParams) -> FragParams {
  var vert = transformVertex(v.pos, v.matrixIndex);

  let i = f32(v.vertexIndex) % 4 * 100;
  vert.x += cos((q.time + i) * 0.01) * 0.1;

  var f: FragParams;
  f.position = vert;
  f.color = vec4f(1, 0, 0, 1);
  return f;
}`);

q5.draw = function () {
  clear();
  shader(wobble);
  plane(0, 0, 100);
};
