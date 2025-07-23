import { Toodle } from "../src/Toodle";
import { createCanvas } from "./util";

const canvas = createCanvas(window.innerWidth, window.innerHeight);

const toodle = await Toodle.attach(canvas, { filter: "nearest" });

await toodle.assets.registerBundle("jumbos", {
  textures: {
    tile0: new URL("/jumbo/stage_0_0.png", import.meta.url),
    tile1: new URL("/jumbo/stage_4096_0.png", import.meta.url),
  },
  autoLoad: true,
  cropTransparentPixels: true,
});

const node = toodle.Node({
  position: { x: 0, y: 1000 },
});

node.add(toodle.Quad("tile0"));
const tile1 = node.add(
  toodle
    .Quad("tile1", {
      color: { r: 1, g: 0, b: 0, a: 1 },
    })
    .setBounds({ left: 4096 / 2 }),
);

function frame() {
  toodle.startFrame();

  toodle.draw(node);
  const jumbo = toodle.JumboQuad("tile0", {
    tiles: [
      {
        textureId: "tile0",
        offset: { x: 0, y: 0 },
      },
      {
        textureId: "tile1",
        offset: { x: 4096, y: 0 },
      },
    ],
    // rotation: performance.now() * 0.01,
    // scale: 1 + Math.sin(performance.now() * 0.001),
  });
  toodle.draw(jumbo);
  toodle.endFrame();
  requestAnimationFrame(frame);
}
frame();

window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "i":
      toodle.camera.y += 100;
      break;
    case "k":
      toodle.camera.y -= 100;
      break;
    case "j":
      toodle.camera.x -= 100;
      break;
    case "l":
      toodle.camera.x += 100;
      break;
    case "u":
      toodle.camera.rotation -= 1;
      break;
    case "o":
      toodle.camera.rotation += 1;
      break;
    case "-":
      toodle.camera.zoom -= 0.1 * toodle.camera.zoom;
      break;
    case "=":
      toodle.camera.zoom += 0.1 * toodle.camera.zoom;
      break;
  }
});
