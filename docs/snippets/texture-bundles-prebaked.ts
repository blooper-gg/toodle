import { Toodle } from "@blooper.gg/toodle";

const canvas = document.querySelector("canvas")!;
const toodle = await Toodle.attach(canvas, {
  filter: "nearest",
  limits: {
    textureArrayLayers: 5,
  },
});

// const baseUrl = window.location.href;
const baseUrl = "http://localhost:5173";
const basePath = "/prebaked";
await toodle.assets.registerBundle("match_vfx", {
  atlases: [
    {
      json: new URL(`${basePath}/match_vfx-0.json`, baseUrl),
      png: new URL(`${basePath}/match_vfx-0.png`, baseUrl),
    },
    {
      json: new URL(`${basePath}/match_vfx-1.json`, baseUrl),
      png: new URL(`${basePath}/match_vfx-1.png`, baseUrl),
    },
  ],
  autoLoad: true,
});

toodle.clearColor = { r: 0, g: 0, b: 0, a: 1 };

let i = 0;

function frame() {
  toodle.startFrame();
  if (toodle.frameCount % 24 === 0) {
    i++;
    i %= 9;
  }

  toodle.draw(toodle.Quad(`vfx/clock/clockno_w_${i + 1}.png`));

  toodle.endFrame();
  requestAnimationFrame(frame);
}

frame();
