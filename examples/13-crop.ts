import { Toodle } from "../src/Toodle";
import { createCanvas } from "./util";

const canvas = createCanvas(window.innerWidth, window.innerHeight);
canvas.style.width = "100vw";
canvas.style.height = "100vh";

const toodle = await Toodle.attach(canvas, { filter: "nearest" });
toodle.clearColor = { r: 0.9, g: 0.9, b: 0.9, a: 1 };

await toodle.assets.loadFont(
  "main",
  new URL("https://toodle.void.dev/fonts/ComicNeue-Regular-msdf.json"),
);

await toodle.assets.registerBundle("cropped", {
  textures: {
    bottomRight: new URL("/img/bottomRightFlush.png", import.meta.url),
    apple: new URL("/img/ItemApple.png", import.meta.url),
    topLeft: new URL("/img/topLeftFlush.png", import.meta.url),
    banana: new URL("/img/ItemBanana.png", import.meta.url),
  },
  cropTransparentPixels: true,
  autoLoad: true,
});

await toodle.assets.registerBundle("uncropped", {
  textures: {
    bottomRightUncropped: new URL("/img/bottomRightFlush.png", import.meta.url),
    topLeftUncropped: new URL("/img/topLeftFlush.png", import.meta.url),
  },
  cropTransparentPixels: false,
  autoLoad: true,
});

const showTransparentPixelsShader = toodle.QuadShader(
  "show transparent pixels",
  toodle.limits.instanceCount,
  /*wgsl*/ `
@fragment
fn fragment(vertex: VertexOutput) -> @location(0) vec4f {
  let color = default_fragment_shader(vertex, nearestSampler);
  return mix(vec4f(1.0, 0.0, 1.0, 0.2), color, step(0.1, color.a));
}
  `,
);

let cropping = "Uncropped";

canvas.addEventListener("click", (e) => {
  cropping = cropping === "" ? "Uncropped" : "";
  frame();
});

function frame() {
  toodle.startFrame();
  toodle.draw(
    toodle.shapes.Line({
      start: { x: -400, y: 0 },
      end: { x: 400, y: 0 },
      color: { r: 0, g: 1, b: 0, a: 1 },
    }),
  );
  toodle.draw(
    toodle.shapes.Line({
      start: { x: 0, y: -400 },
      end: { x: 0, y: 400 },
      color: { r: 0, g: 0, b: 1, a: 1 },
    }),
  );

  const tree = toodle.Quad(`topLeft${cropping}`, {
    shader: showTransparentPixelsShader,
    rotation: performance.now() / 100,
    position: {
      x: Math.sin(performance.now() / 1000) * 100,
      y: Math.cos(performance.now() / 1000) * 100,
    },
  });

  tree.add(
    toodle.Quad(`bottomRight${cropping}`, {
      shader: showTransparentPixelsShader,
      rotation: performance.now() / 100,
    }),
  );
  toodle.draw(tree);
  toodle.draw(
    toodle.Text("main", "Click anywhere to toggle", {
      position: { x: 200, y: 200 },
      color: { r: 0, g: 0, b: 0, a: 1 },
    }),
  );

  toodle.endFrame();
  requestAnimationFrame(frame);
}
frame();
