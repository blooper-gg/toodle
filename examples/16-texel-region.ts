import { Toodle } from "../src/Toodle";
import type { TexelRegion } from "../src/textures/types";
import { createCanvas } from "./util";

const canvas = createCanvas(window.innerWidth, window.innerHeight);

const toodle = await Toodle.attach(canvas, { filter: "nearest" });

await toodle.assets.registerBundle("mario", {
  textures: {
    // apple: new URL("/img/ItemApple.png", import.meta.url),
    goombird: new URL("/img/goombird.png", import.meta.url),
  },
  autoLoad: true,
});

// const quad = toodle.Quad("goombird");

const atlasShader = toodle.QuadShader(
  "texture atlas viewer",
  toodle.limits.instanceCount,
  /*wgsl*/ `
@vertex
fn vert(
  @builtin(vertex_index) VertexIndex: u32,
  @builtin(instance_index) InstanceIndex: u32,
  instance: InstanceData,
) -> VertexOutput {
  var output = default_vertex_shader(VertexIndex, InstanceIndex, instance);
  //
  output.engine_uv.x = output.engine_uv.z;
  output.engine_uv.y = output.engine_uv.w;

  output.engine_atlasIndex = InstanceIndex;
  return output;
}

@fragment
fn fragment(vertex: VertexOutput) -> @location(0) vec4<f32> {
  let color = default_fragment_shader(vertex, nearestSampler);
  if (color.a == 0.0) {
      return vec4f(1.0, 0.0, 1.0, 1.0);
  }
  return color;
  // return color;
}
`,
);

const regionShader = toodle.QuadShader(
  "region viewer",
  toodle.limits.instanceCount,
  /*wgsl*/ `
  @vertex
fn vert(
  @builtin(vertex_index) VertexIndex: u32,
  @builtin(instance_index) InstanceIndex: u32,
  instance: InstanceData,
) -> VertexOutput {
  var output = default_vertex_shader(VertexIndex, InstanceIndex, instance);
  output.engine_uv.x = output.engine_uv.z;
  output.engine_uv.y = output.engine_uv.w;

  output.engine_atlasIndex = InstanceIndex;
  return output;
}

@fragment
fn fragment(vertex: VertexOutput) -> @location(0) vec4<f32> {
  let color = default_fragment_shader(vertex, nearestSampler);
  if (color.a == 0.0) {
      return vec4f(0.0, 1.0, 1.0, 1.0);
  }
  return color;
  // return color;
}
  `,
);

console.log(regionShader.code);

const goomyB = toodle.assets.extra.getAtlasCoords("goombird")[0];
console.log(goomyB);
const animatedQuad = toodle.Quad("goombird", {
  position: { x: 0, y: 0 },
  idealSize: {
    width: 48,
    height: 48,
  },
  region: {
    x: 0,
    y: 0,
    width: 48,
    height: 48,
  },
});

// show a debug thing of the current frame
const fontId = await toodle.assets.loadFont(
  "ComicNeue",
  new URL("https://toodle.gg/fonts/ComicNeue-Regular-msdf.json"),
);

const text = toodle.Text("ComicNeue", "Hello World", {
  fontSize: 16,
  color: { r: 0, g: 0, b: 0, a: 1 },
});

// show the full atlas
// const atlas = toodle.Quad("goombird");

const texelRegion: TexelRegion = {
  x: 0,
  y: 0,
  width: 48,
  height: 48,
};

const spritesheetSize = toodle.assets.getSize("goombird");

toodle.camera.zoom = 1.5;

const frameCount = spritesheetSize.width / texelRegion.width;
let frame = 0;

let acc = performance.now();
function paint() {
  toodle.startFrame();

  if (performance.now() - acc > (12 * 1000) / 60) {
    acc = performance.now();
    frame++;
    frame %= frameCount;
  }

  // toodle.draw(quad);
  toodle.draw(animatedQuad);
  animatedQuad.region!.x = frame * texelRegion.width;
  texelRegion.x = frame * texelRegion.width;

  // toodle.draw(
  //   toodle.shapes
  //     .Rect({
  //       idealSize: texelRegion,
  //       color: {
  //         r: 1,
  //         g: 0,
  //         b: 0,
  //         a: 0.2,
  //       },
  //     })
  //     .setBounds({
  //       left: -spritesheetSize.width / 2 + texelRegion.x,
  //       top: spritesheetSize.height / 2 - texelRegion.y,
  //     }),
  // );

  text.text = `Frame: ${frame}`;
  text.y = 200;

  toodle.draw(text);

  toodle.endFrame();
  requestAnimationFrame(paint);
}
paint();
