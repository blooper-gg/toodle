import type { SceneNode } from "../scene/SceneNode";
import type { EngineUniform } from "./EngineUniform";

export interface IShader {
  startFrame: (device: GPUDevice, uniform: EngineUniform) => void;

  /**
   * Process a batch of nodes.
   *
   * @param renderPass - The render pass to use.
   * @param nodes - The nodes to process.
   * @returns The number of draw calls made.
   */
  processBatch: (
    renderPass: GPURenderPassEncoder,
    nodes: SceneNode[],
  ) => number;

  endFrame: () => void;
}
