import type { Color } from "../../coreTypes/Color";
import { defaults, renderToTarget } from "./util";

export function blur(
  encoder: GPUCommandEncoder,
  context: GPUCanvasContext,
  device: GPUDevice,
  clearColor: Color,
  presentationFormat: GPUTextureFormat,
  pingpong: [GPUTexture, GPUTexture],
) {
  const blurRadius = 20;

  const weights = gaussianWeights(blurRadius);
  const lines = weights.map((w) => w.toFixed(7)).join(", ");
  const wgslFragment = `let weights = array<f32, ${weights.length}>(${lines});`;

  const brightPipeline = device.createRenderPipeline({
    ...defaults.pipelineDescriptor(device),
    label: "toodle post process - brightness pass",
    fragment: {
      targets: [{ format: presentationFormat }],
      module: device.createShaderModule({
        label: "toodle post process - brightness pass",
        code: /*wgsl*/ `
  @group(0) @binding(0) var tex: texture_2d<f32>;
  @group(0) @binding(1) var samp: sampler;
  @group(0) @binding(2) var<uniform> engineUniform: EngineUniform;

  struct EngineUniform {
    // resolution of the canvas in physical pixels
    resolution: vec2f,
    random: f32,
    time: f32,
  };

  @fragment
  fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let color = textureSample(tex, samp, uv);
    let _nope = engineUniform.time;
    return color;
  }
          `,
      }),
    },
  });

  const horizontalBlurPipeline = device.createRenderPipeline({
    ...defaults.pipelineDescriptor(device),
    label: "toodle post process - horizontal blur",
    fragment: {
      targets: [{ format: presentationFormat }],
      module: device.createShaderModule({
        label: "toodle post process - horizontal blur",
        code: /*wgsl*/ `
@group(0) @binding(0) var tex: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> engineUniform: EngineUniform;

struct EngineUniform {
  // resolution of the canvas in physical pixels
  resolution: vec2f,
  random: f32,
  time: f32,
};

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let pixelSize = 1.0 / engineUniform.resolution;
  let offset = vec2f(pixelSize.x, 0.0); // horizontal

  // Gaussian weights for 5-tap kernel
  // let weights = array<f32, 5>(0.204164, 0.304005, 0.093913, 0.010381, 0.000336);
  ${wgslFragment}

  var color = textureSample(tex, samp, uv) * weights[0];
  for (var i = 1; i < ${weights.length}; i++) {
    color += textureSample(tex, samp, uv + offset * f32(i)) * weights[i];
    color += textureSample(tex, samp, uv - offset * f32(i)) * weights[i];
  }

  return color;
}
  `,
      }),
    },
  });

  const verticalBlurPipeline = device.createRenderPipeline({
    ...defaults.pipelineDescriptor(device),
    label: "toodle post process - vertical blur",
    fragment: {
      targets: [{ format: presentationFormat }],
      module: device.createShaderModule({
        label: "toodle post process - vertical blur",
        code: /*wgsl*/ `
        @group(0) @binding(0) var tex: texture_2d<f32>;
        @group(0) @binding(1) var samp: sampler;
        @group(0) @binding(2) var<uniform> engineUniform: EngineUniform;

        struct EngineUniform {
          // resolution of the canvas in physical pixels
          resolution: vec2f,
          random: f32,
          time: f32,
        };

        @fragment
        fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
          let pixelSize = 1.0 / engineUniform.resolution;
          let offset = vec2f(0.0, pixelSize.y); // vertical

          // Gaussian weights for 5-tap kernel
          // let weights = array<f32, 5>(0.204164, 0.304005, 0.093913, 0.010381, 0.000336);
          ${wgslFragment}

          var color = textureSample(tex, samp, uv) * weights[0];
          for (var i = 1; i < ${weights.length}; i++) {
            color += textureSample(tex, samp, uv + offset * f32(i)) * weights[i];
            color += textureSample(tex, samp, uv - offset * f32(i)) * weights[i];
          }

          return color;
        }
                `,
      }),
    },
  });

  renderToTarget(
    "blur",
    pingpong[0],
    pingpong[1],
    device,
    encoder,
    horizontalBlurPipeline,
    clearColor,
  );

  renderToTarget(
    "blur",
    pingpong[1],
    context.getCurrentTexture(),
    device,
    encoder,
    verticalBlurPipeline,
    clearColor,
  );
}

// Gaussian function is
// G(x) = exp(-x² / (2σ²))
// where x is the distance from the center and σ is the standard deviation.
function gaussianWeights(radius: number, sigma = radius / 2): number[] {
  const weights = [];
  let sum = 0;

  for (let i = 0; i <= radius; i++) {
    const w = Math.exp(-0.5 * (i / sigma) ** 2);
    weights.push(w);
    sum += i === 0 ? w : w * 2;
  }

  return weights.map((w) => w / sum); // normalize to sum = 1
}
