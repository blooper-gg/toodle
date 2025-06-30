import { Toodle } from "../src/Toodle";
import { Palette, createCanvas } from "./util";

const canvas = createCanvas(window.innerWidth, window.innerHeight);
canvas.style.width = "100vw";
canvas.style.height = "100vh";

const toodle = await Toodle.attach(canvas, { filter: "nearest" });
toodle.clearColor = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
await toodle.assets.loadTexture(
  "offsetTest",
  new URL("/img/MewTransparentExample.png", import.meta.url),
);

await toodle.assets.loadTexture(
  "offsetTestExample",
  new URL("/img/MewBackgroundExample.png", import.meta.url),
);

await toodle.assets.loadTexture(
  "emptyImageExample",
  new URL("/img/MissingTexture.png", import.meta.url),
);

const fontId = await toodle.assets.loadFont(
  "ComicNeue",
  new URL("/fonts/ComicNeue-Regular-msdf.json", window.location.href),
);

const fontSize = 30;

const offsetQuad = toodle.Quad("offsetTest", {
  position: {
    x: 0,
    y: 0,
  },
  cropOffset: {
    x: 0,
    y: 0,
  },
});

const noOffsetQuad = toodle.Quad("offsetTest", {
  position: {
    x: 0,
    y: 0,
  },
});

const offsetQuadExample = toodle.Quad("offsetTestExample", {
  position: {
    x: -400,
    y: 0,
  },
  rotation: 90,
});

const emptyImageExample = toodle.Quad("emptyImageExample", {
  position: { x: 500, y: -500 },
});

const emptyImageText = toodle.Text(
  "ComicNeue",
  "Example with with ONLY Transparent Pixels\n",
  {
    fontSize,
    color: Palette.WHITE,
  },
);

offsetQuadExample.add(offsetQuad);
emptyImageExample.add(emptyImageText);

function frame() {
  toodle.startFrame();
  toodle.draw(emptyImageExample);
  if (offsetQuadExample.rotation > 360) {
    offsetQuadExample.rotation = 0;
  } else offsetQuadExample.rotation += 0.1;
  toodle.draw(offsetQuadExample);
  toodle.draw(offsetQuad);
  toodle.draw(noOffsetQuad);
  toodle.endFrame();
  requestAnimationFrame(frame);
}
frame();
