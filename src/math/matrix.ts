import { type Mat3, mat3, vec2 } from "wgpu-matrix";
import type { Point } from "../coreTypes/Point";
import type { Transform } from "../coreTypes/Transform";
import type { Camera } from "../scene/Camera";
import type { Resolution } from "../screen/resolution";

/**
 * Creates a projection matrix for the given resolution.
 * The matrix is a 3x3 matrix that converts screen coordinates centered at the origin ranging from:
 *
 * (-resolution.width / 2, resolution.height / 2) = top left corner to (resolution.width / 2, -resolution.height / 2) = bottom right corner
 *
 * into clip space centered at the originranging from:
 *
 * (-1, 1) = top left corner to (1, -1) = bottom right corner
 *
 * @param resolution - The resolution of the screen in logical pixels.
 * @param dst - The destination matrix.
 * @returns The projection matrix.
 */
export function createProjectionMatrix(resolution: Resolution, dst?: Mat3) {
  const { width, height } = resolution;

  // origin is always the same
  // (0,0) => (0 * 2 / 1920, 0 * 2 / 1080) => (0,0)
  //
  // top left corner is (-1, 1) in clip space, (-width / 2, height / 2) in screen space e.g.
  // (-960, 540) => (-960 * 2 / 1920, 540 * 2 / 1080) => (-1, 1)
  return mat3.scaling([2 / width, 2 / height], dst);
}

export function createViewMatrix(camera: Camera, target: Mat3) {
  const matrix = mat3.identity(target);

  // Apply scaling
  mat3.scale(matrix, [camera.zoom, camera.zoom], matrix);

  // Apply rotation
  mat3.rotate(matrix, camera.rotationRadians, matrix);

  // Apply translation
  mat3.translate(matrix, [-camera.x, -camera.y], matrix);

  return matrix;
}

export function createModelMatrix(transform: Transform, base: Mat3) {
  // Apply translation
  mat3.translate(base, [transform.position.x, transform.position.y], base);
  // Apply rotation
  mat3.rotate(base, transform.rotation, base);

  // Apply scaling
  mat3.scale(base, [transform.scale.x, transform.scale.y], base);

  return base;
}

export function convertScreenToWorld(
  screenCoordinates: Point,
  camera: Camera,
  projectionMatrix: Mat3,
  resolution: Resolution,
): Point {
  const inverseViewProjectionMatrix = mat3.mul(
    mat3.inverse(camera.matrix),
    mat3.inverse(projectionMatrix),
  );
  const normalizedDeviceCoordinates = {
    x: (2 * screenCoordinates.x) / resolution.width - 1,
    y: 1 - (2 * screenCoordinates.y) / resolution.height,
  };
  return transformPoint(
    normalizedDeviceCoordinates,
    inverseViewProjectionMatrix,
  );
}

export function convertWorldToScreen(
  worldCoordinates: Point,
  camera: Camera,
  projectionMatrix: Mat3,
  resolution: Resolution,
): Point {
  const viewProjectionMatrix = mat3.mul(projectionMatrix, camera.matrix);
  const ndcPoint = transformPoint(worldCoordinates, viewProjectionMatrix);
  return {
    x: ((ndcPoint.x + 1) * resolution.width) / 2,
    y: ((1 - ndcPoint.y) * resolution.height) / 2,
  };
}

export function transformPoint(point: Point, matrix: Mat3): Point {
  const result = vec2.transformMat3([point.x, point.y], matrix);
  return {
    x: result[0],
    y: result[1],
  };
}
