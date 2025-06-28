import { Toodle } from "../src/Toodle";
import { TexelRegion } from "../src/textures/types";
import { createCanvas } from "./util";

const canvas = createCanvas(window.innerWidth, window.innerHeight);

const toodle = await Toodle.attach(canvas, { filter: "nearest" });

await toodle.assets.registerBundle("mario", {
  textures: {
    goombird: new URL("/img/goombird.png", import.meta.url),
  },
  autoLoad: true,
});

const quad = toodle.Quad("goombird");

const texelRegion: TexelRegion = {
  x: 0,
  y: 0,
  width: 48,
  height: 48,
};

const spritesheetSize = toodle.assets.getSize("goombird");
const frameCount = 10;

toodle.camera.zoom = 1.5;

let acc = performance.now();
function frame() {
  toodle.startFrame();
  toodle.draw(quad);

  if (performance.now() - acc > (12 * 1000) / 60) {
    acc = performance.now();
    texelRegion.x += texelRegion.width;
    texelRegion.x %= spritesheetSize.width;
  }

  toodle.draw(
    toodle.shapes
      .Rect({
        idealSize: texelRegion,
        color: {
          r: 1,
          g: 0,
          b: 0,
          a: 0.2,
        },
      })
      .setBounds({
        left: -spritesheetSize.width / 2 + texelRegion.x,
        top: spritesheetSize.height / 2 - texelRegion.y,
      }),
  );

  toodle.endFrame();
  requestAnimationFrame(frame);
}
frame();
