console.log("diagnose: before q5 import");

import "./mystral-shim.js";

import("./q5.js")
  .then(() => {
    console.log("diagnose: q5 import completed");
    console.log("diagnose: typeof Q5 = " + typeof Q5);
    console.log("diagnose: typeof window = " + typeof window);
    console.log("diagnose: typeof Canvas = " + typeof Canvas);
    
    const CANVAS_W = 1280, CANVAS_H = 720;
    let canvas = Canvas(CANVAS_W, CANVAS_H);

    if (window.innerWidth !== CANVAS_W || window.innerHeight !== CANVAS_H) {
      console.error(`Canvas/window size mismatch: window is ${window.innerWidth}x${window.innerHeight}, expected ${CANVAS_W}x${CANVAS_H}. Run with --width ${CANVAS_W} --height ${CANVAS_H}.`);
      process.exit(1);
    }
    
    return canvas;
  })
  .then(() => {
    console.log("diagnose: Canvas ready");
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

    console.log("diagnose: hello world drawn");
  })
  .catch((error) => {
    console.log("diagnose: q5 import failed");
    console.log("diagnose: error = " + String(error));
    console.log("diagnose: stack = " + (error?.stack || "<none>"));
  });