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

const tile0Size = toodle.assets.getSize("tile0");
const tile1Size = toodle.assets.getSize("tile1");

const tile0Coords = toodle.assets.extra.getAtlasCoords("tile0");
const tile1Coords = toodle.assets.extra.getAtlasCoords("tile1");

console.log({ tile0Coords, tile1Coords });

const size = {
  width: tile0Size.width + tile1Size.width,
  height: tile0Size.height,
};
console.log(size);

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

console.log({ tile1Size: tile1.size });

function frame() {
  toodle.startFrame();

  toodle.draw(node);
  // toodle.draw(toodle.Quad("tile0"));

  // const tile1 = toodle.Quad("tile1").setBounds({ left: 4096 / 2, y: 20 });
  // toodle.draw(tile1);

  const jumbo = toodle.JumboQuad("tile0", {
    idealSize: size,
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
    rotation: performance.now() * 0.01,
    scale: 1 + Math.sin(performance.now() * 0.001),
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
