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
});

function frame() {
  toodle.startFrame();
  toodle.draw(toodle.Quad("tile0"));

  const tile1 = toodle.Quad("tile1").setBounds({ left: 4096 / 2, y: 20 });
  toodle.draw(tile1);
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
