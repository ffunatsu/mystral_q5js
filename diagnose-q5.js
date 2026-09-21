console.log("diagnose: before q5 import");

import "./mystral-shim.js";

import("./q5.js")
  .then(() => {
    console.log("diagnose: q5 import completed");
    console.log("diagnose: typeof Q5 = " + typeof Q5);
    console.log("diagnose: typeof window = " + typeof window);
    console.log("diagnose: typeof Canvas = " + typeof Canvas);
    return Canvas(1280, 720);
  })
  .then(() => {
    console.log("diagnose: Canvas ready");
    background("#101820");
    fill("#f2f4f3");
    circle(0, 0, 160);
    // textAlign(CENTER, CENTER);
    // textSize(48);
    // text("Hello, world!", width / 2, height / 2);
    console.log("diagnose: hello world drawn");
  })
  .catch((error) => {
    console.log("diagnose: q5 import failed");
    console.log("diagnose: error = " + String(error));
    console.log("diagnose: stack = " + (error?.stack || "<none>"));
  });