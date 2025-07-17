import { Toodle } from "@blooper.gg/toodle";
import cropShader from "../src/textures/crop.wgsl";
import type { CpuTextureAtlas } from "../src/textures/types";
import { getBitmapFromUrl } from "../src/textures/util";
import { createCanvas } from "./util";

const canvas = createCanvas(window.innerWidth, window.innerHeight);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// const cpuTextureAtlases = await registerJumboTexture(
//   new URL("img/shc.png", window.location.origin),
// );
const cpuTextureAtlases = await registerJumboTexture(
  new URL("img/shc.png", window.location.origin),
);

const texture = cpuTextureAtlases[0].texture;

// debug draw the texture
// const context = canvas.getContext("2d");
// context?.drawImage(texture, 0, 0, texture.width / 5, texture.height / 5);

const toodle = await Toodle.attach(canvas, {
  filter: "linear",
  limits: { textureArrayLayers: 5 },
});

const device = toodle.extra.device();

// Create GPU texture with same dimensions as CPU texture
const inputTexture = device.createTexture({
  size: [texture.width, texture.height],
  format: "rgba8unorm",
  usage:
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_DST |
    GPUTextureUsage.RENDER_ATTACHMENT,
});

const outputTexture = device.createTexture({
  size: [4096, 4096],
  format: "rgba8unorm",
  usage:
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_DST |
    GPUTextureUsage.RENDER_ATTACHMENT,
});

// Copy ImageBitmap directly to GPU
device.queue.copyExternalImageToTexture(
  { source: texture },
  { texture: inputTexture },
  [texture.width, texture.height],
);

const bindGroupLayout = device.createBindGroupLayout({
  label: "Cropping Layout",
  entries: [
    { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: {} },
    {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      storageTexture: {
        access: "write-only",
        format: "rgba8unorm",
        viewDimension: "2d",
      },
    },
    {
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "uniform" },
    },
    {
      binding: 3,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" },
    },
  ],
});

const pipeline = device.createComputePipeline({
  label: "Jumbo Texture Pipeline",
  layout: device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  }),
  compute: {
    module: device.createShaderModule({
      label: "Crop Shader",
      code: cropShader,
    }),
    entryPoint: "crop_and_output",
  },
});
const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: inputTexture.createView({
        dimension: "2d",
        baseArrayLayer: inputLayer,
        arrayLayerCount: 1,
      }),
    },
    {
      binding: 1,
      resource: outputTexture.createView({
        dimension: "2d",
      }),
    },
    { binding: 2, resource: { buffer: boundsUniform } },
  ],
});

// const jumboTexture = new URL("img/shc.png", window.location.origin);

// // fetch the jumbo texture
// // cut it up
// // populate cpu-side atlases
// await toodle.assets.registerJumboTexture("shc", jumboTexture);
// // copy cpu atlases to gpu
// // update atlas coordinates
// await toodle.assets.loadJumboTexture("shc");

// // State for demo
// const state = {
//   atlasIndex: 0,
// };

// function frame() {
//   toodle.startFrame();
//   toodle.draw(toodle.JumboQuad("shc"));
//   toodle.camera.x = Math.sin(toodle.frameCount / 700) * 2000;
//   toodle.endFrame();
//   requestAnimationFrame(frame);
// }

// frame();

async function registerJumboTexture(url: URL): Promise<CpuTextureAtlas[]> {
  const textureBitmap = await getBitmapFromUrl(url);
  return [
    {
      texture: textureBitmap,
      textureRegions: new Map(),
    },
  ];
}
