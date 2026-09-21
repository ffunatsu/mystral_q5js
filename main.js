import "./mystral-shim.js";
import "q5";

console.log("before Canvas");
await Canvas(640, 360);
console.log("Canvas ready");

background("#101820");
fill("#f2f4f3");
circle(width / 2, height / 2, 160);
// textAlign(CENTER, CENTER);
// textSize(48);
// text("Hello, world!", width / 2, height / 2);
console.log("hello world drawn");