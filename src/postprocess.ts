import type { Color } from "./coreTypes/Color";

export function postProcess(
  encoder: GPUCommandEncoder,
  context: GPUCanvasContext,
  device: GPUDevice,
  clearColor: Color,
  presentationFormat: GPUTextureFormat,
  pingpong: [GPUTexture, GPUTexture],
) {
  const postProcess = encoder.beginRenderPass({
    label: "toodle post process",
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: clearColor,
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  const pipeline = device.createRenderPipeline({
    label: "toodle post process",
    layout: "auto",

    primitive: {
      topology: "triangle-strip",
    },
    vertex: {
      buffers: [
        {
          arrayStride: 4 * 4,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" }, // position
            { shaderLocation: 1, offset: 0, format: "float32x2" }, // uv
          ],
        },
      ],
      module: device.createShaderModule({
        label: "toodle post process vertex shader",
        code: `
struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

const enginePosLookup = array(vec2f(-1, 1), vec2f(-1, -1), vec2f(1, 1), vec2f(1, -1));
const engineUvLookup = array(vec2f(0, 0), vec2f(0, 1), vec2f(1, 0), vec2f(1, 1));

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {
  var out: VertexOut;
  out.position = vec4(enginePosLookup[vertexIndex], 0.0, 1.0);
  out.uv = engineUvLookup[vertexIndex];
  return out;
}
  `,
      }),
    },
    fragment: {
      targets: [{ format: presentationFormat }],
      module: device.createShaderModule({
        label: "toodle post process fragment shader",
        code: `
          @group(0) @binding(0) var inputTex: texture_2d<f32>;
          @group(0) @binding(1) var inputSampler: sampler;


          @fragment
          fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
            let color = textureSample(inputTex, inputSampler, uv);
            return vec4f(1. - color.rgb, color.a);
          }
  `,
      }),
    },
  });

  const sampler = device.createSampler({
    label: "toodle post process sampler",
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  const bindGroup = device.createBindGroup({
    label: "toodle post process bind group",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: pingpong[0].createView() },
      { binding: 1, resource: sampler },
    ],
  });

  // biome-ignore format:it's a matrix
  const fullscreenQuadVerts = new Float32Array([
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
     1,  1,  1, 1,
  ]);

  const fullscreenVB = device.createBuffer({
    size: fullscreenQuadVerts.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(fullscreenVB.getMappedRange()).set(fullscreenQuadVerts);
  fullscreenVB.unmap();

  postProcess.setPipeline(pipeline);
  postProcess.setBindGroup(0, bindGroup);
  postProcess.setVertexBuffer(0, fullscreenVB);
  postProcess.draw(4, 1, 0, 0);

  postProcess.end();
}
