import "./mystral-shim.js";
import "./q5.js";

await Canvas(1280, 720);

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
