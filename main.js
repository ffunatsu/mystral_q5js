import "./mystral-shim.js";
import "./q5.js";

console.log("before Canvas");
await Canvas(1280, 720);
console.log("Canvas ready");

background("#101820");
noStroke();

fill("#ff6b6b");
circle(-280, -120, 180);

fill("#ffd166");
rect(-90, -120, 180, 140);

fill("#4ecdc4");
triangle(150, 60, 300, -160, 390, 60);

stroke("#f2f4f3");
strokeWeight(10);
line(-440, 180, 440, 180);

console.log("hello world drawn");