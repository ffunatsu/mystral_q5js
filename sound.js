import "./mystral-shim.js";
import "./q5.js";

await Canvas();

background("#101820");

fill("#ffd166");
circle(0, 0, 180);

fill("#fcfdff");
textAlign(CENTER, CENTER);
textSize(28);
text("q5 sound", 100, 100);

userStartAudio();
const sound = await loadSound("sound.wav");
sound.volume = 0.35;
sound.play();

console.log("sound example ready", sound.loaded, sound.buffer.duration.toFixed(2) + "s");
await new Promise((resolve) => setTimeout(resolve, 1200));

process.exit(0);