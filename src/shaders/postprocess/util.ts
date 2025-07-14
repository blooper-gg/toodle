import type { Color } from "../../coreTypes/Color";

export const defaults = {
  sampler(device: GPUDevice): GPUSampler {
    return device.createSampler({
      label: "toodle post process sampler",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
  },

  vertexBufferLayout(device: GPUDevice): GPUVertexBufferLayout {
    return {
      arrayStride: 4 * 4,
      attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
    };
  },

  vertexShader(device: GPUDevice): GPUShaderModule {
    return device.createShaderModule({
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
    });
  },

  pipelineDescriptor(device: GPUDevice): GPURenderPipelineDescriptor {
    return {
      label: "toodle post process pipeline descriptor",
      layout: "auto",

      primitive: { topology: "triangle-strip" },
      vertex: {
        buffers: [defaults.vertexBufferLayout(device)],
        module: defaults.vertexShader(device),
      },
    };
  },
} as const;

export function renderToTarget(
  label: string,
  from: GPUTexture,
  to: GPUTexture,
  device: GPUDevice,
  encoder: GPUCommandEncoder,
  pipeline: GPURenderPipeline,
  clearColor: Color,
  bindGroups?: GPUBindGroup[],
) {
  // biome-ignore format:it's a matrix
  const fullscreenQuadVerts = new Float32Array([
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
     1,  1,  1, 1,
  ]);

  // create vertex buffer
  // todo: only create this once
  const fullscreenVB = device.createBuffer({
    size: fullscreenQuadVerts.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(fullscreenVB.getMappedRange()).set(fullscreenQuadVerts);
  fullscreenVB.unmap();

  // create engine uniform
  // todo: only create this once
  const engineUniform = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  const engineUniformData = new Float32Array(engineUniform.getMappedRange());
  engineUniformData[0] = from.width;
  engineUniformData[1] = from.height;
  engineUniformData[2] = Math.random();
  engineUniformData[3] = performance.now() / 1000;
  engineUniform.unmap();

  // create bind group
  const bindGroup = device.createBindGroup({
    label: `${label} engine bind group`,
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: from.createView() },
      { binding: 1, resource: defaults.sampler(device) },
      { binding: 2, resource: engineUniform },
    ],
  });

  const renderPass = encoder.beginRenderPass({
    label: `${label} render pass`,
    colorAttachments: [
      {
        view: to.createView(),
        clearValue: clearColor,
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  renderPass.setPipeline(pipeline);
  renderPass.setVertexBuffer(0, fullscreenVB);
  renderPass.setBindGroup(0, bindGroup);
  if (bindGroups) {
    for (let i = 0; i < bindGroups.length; i++) {
      renderPass.setBindGroup(i + 1, bindGroups[i]);
    }
  }
  renderPass.draw(4, 1, 0, 0);

  renderPass.end();
}
