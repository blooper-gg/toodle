import type { Point } from "./Point";
import type { Size } from "./Size";
import type { Vec2 } from "./Vec2";

export type Transform = {
  position: Point;
  scale: Vec2;
  rotation: number;
  /**
   * width and height of the quad
   *
   * these are multiplied with scale for rendering
   * but they are not used to calculate child transforms
   */
  size: Size;
};
