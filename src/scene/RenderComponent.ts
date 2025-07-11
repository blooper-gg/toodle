import type { IShader } from "../shaders/IShader";
import type { SceneNode } from "./SceneNode";

export type RenderComponent = {
  shader: IShader;
  data?: Float32Array;

  /**
   * Write cpu instance data to the buffer
   */
  writeInstance: (node: SceneNode, dst: Float32Array, offset: number) => void;
};
