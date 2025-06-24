import { describe, expect, it } from "bun:test";
import { mat3, vec2 } from "wgpu-matrix";
import {
  convertScreenToWorld,
  convertWorldToScreen,
  createModelMatrix,
  createProjectionMatrix,
} from "../../src/math/matrix";
import type { Point } from "../../src/mod";
import { Camera } from "../../src/scene/Camera";
import { SceneNode } from "../../src/scene/SceneNode";

describe("mvp matrix", () => {
  it("gives the correct top left vertex", () => {
    const projection = createProjectionMatrix({ width: 100, height: 100 });
    // this is a 50x50 quad at (-25, 25)
    const model = createModelMatrix(
      {
        position: { x: -25, y: 25 },
        scale: { x: 50, y: 50 },
        rotation: 0,
        size: { width: 1, height: 1 },
      },
      mat3.identity(),
    );

    // see quad.wgsl.ts, the top left vertex is (-0.5, 0.5) instead of (-1, 1)
    const topLeftVertex = vec2.create(-0.5, 0.5);
    // in pixels, the top left vertex should be at (-50, 50) which is the top left of the canvas
    const topLeftPx = vec2.transformMat3(topLeftVertex, model);
    // in normalized device coordinates, the top left vertex should be at (-1, 1)
    const topLeftNdc = vec2.transformMat3(topLeftPx, projection);

    expect(topLeftPx).toEqual(vec2.create(-50, 50));
    expect(topLeftNdc).toEqual(vec2.create(-1, 1));
  });
});

describe("coordinate conversion", () => {
  for (const t of [
    {
      in: { x: 0, y: 0 },
      out: { x: -500, y: 1000 },
      resolution: { width: 1000, height: 2000 },
    },
    {
      in: { x: 1000, y: 2000 },
      out: { x: 500, y: -1000 },
      resolution: { width: 1000, height: 2000 },
    },
    {
      in: { x: 100, y: 100 },
      out: { x: 0, y: 0 },
      resolution: { width: 200, height: 200 },
    },
  ]) {
    it(`converts screen = (${t.in.x}, ${t.in.y}) -> world = (${t.out.x}, ${t.out.y}) at ${t.resolution.width}x${t.resolution.height}`, () => {
      const projection = createProjectionMatrix(t.resolution);
      const point: Point = t.in;

      const camera = new Camera();

      const worldCoordinates = convertScreenToWorld(
        point,
        camera,
        projection,
        t.resolution,
      );

      expect(worldCoordinates.x).toBeCloseTo(t.out.x);
      expect(worldCoordinates.y).toBeCloseTo(t.out.y);
    });
  }

  for (const t of [
    {
      in: { x: 0, y: 0 },
      out: { x: 500, y: 1000 },
      resolution: { width: 1000, height: 2000 },
    },
    {
      in: { x: -500, y: 1000 },
      out: { x: 0, y: 0 },
      resolution: { width: 1000, height: 2000 },
    },
    {
      in: { x: 100, y: -100 },
      out: { x: 200, y: 200 },
      resolution: { width: 200, height: 200 },
    },
  ]) {
    it(`converts world = (${t.in.x}, ${t.in.y}) -> screen = (${t.out.x}, ${t.out.y}) at ${t.resolution.width}x${t.resolution.height}`, () => {
      const projection = createProjectionMatrix(t.resolution);
      const point: Point = t.in;

      const camera = new Camera();

      const screenCoordinates = convertWorldToScreen(
        point,
        camera,
        projection,
        t.resolution,
      );

      expect(screenCoordinates.x).toBeCloseTo(t.out.x);
      expect(screenCoordinates.y).toBeCloseTo(t.out.y);
    });
  }

  it("converts screen coordinates to world coordinates accounting for camera", () => {
    const camera = new Camera();
    camera.zoom = 0.5;

    const resolution = { width: 2000, height: 1000 };

    const projection = createProjectionMatrix(resolution);

    const screenCoordinates = { x: 0, y: 0 };
    const worldCoordinates = convertScreenToWorld(
      screenCoordinates,
      camera,
      projection,
      resolution,
    );

    expect(worldCoordinates.x).toBeCloseTo(-2000);
    expect(worldCoordinates.y).toBeCloseTo(1000);
  });
});
