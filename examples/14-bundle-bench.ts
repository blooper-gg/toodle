import { Toodle } from "../src/Toodle";
import { createCanvas } from "./util";

const canvas = createCanvas(window.innerWidth, window.innerHeight);
const toodle = await Toodle.attach(canvas, { filter: "nearest" });

const textures: Record<string, URL> = {};

for (let i = 0; i < 1100; i++) {
  textures[`shoryu${i}`] = new URL(
    `/img/Sword_Shoryu_0${(i % 8) + 1}.png`,
    window.location.href,
  );
}

console.log(textures);

console.time("registerBundle");
await toodle.assets.registerBundle("bigBundle", {
  textures,
  autoLoad: true,
  cropTransparentPixels: true,
});
console.timeEnd("registerBundle");
let animationFrame = 0;

console.log(toodle.assets.extra.getAtlasUsage().available);

function frame() {
  toodle.startFrame();
  animationFrame = Math.floor(toodle.frameCount / 10) % 8;

  toodle.draw(
    toodle.Quad(`shoryu${animationFrame}`, {
      position: { x: 0, y: 0 },
    }),
  );
  toodle.endFrame();
  requestAnimationFrame(frame);
}

frame();
