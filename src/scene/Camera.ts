import { mat3 } from "wgpu-matrix";
import type { Vec2 } from "../coreTypes/Vec2";
import { deg2rad, rad2deg } from "../math/angle";
import { createViewMatrix } from "../math/matrix";

export class Camera {
  #position: Vec2 = { x: 0, y: 0 };
  #zoom = 1;
  #rotation = 0;
  #isDirty = true;
  #matrix = mat3.create();

  get zoom() {
    return this.#zoom;
  }

  set zoom(value: number) {
    this.#zoom = value;
    this.setDirty();
  }

  get rotation() {
    return rad2deg(this.#rotation);
  }

  set rotation(value: number) {
    this.#rotation = deg2rad(value);
    this.setDirty();
  }

  get rotationRadians() {
    return this.#rotation;
  }

  set rotationRadians(value: number) {
    this.#rotation = value;
    this.setDirty();
  }

  get x() {
    return this.#position.x;
  }

  get y() {
    return this.#position.y;
  }

  set x(value: number) {
    this.#position.x = value;
    this.setDirty();
  }

  set y(value: number) {
    this.#position.y = value;
    this.setDirty();
  }

  get matrix() {
    if (this.#isDirty) {
      this.#isDirty = false;
      this.#matrix = createViewMatrix(this, this.#matrix);
    }
    return this.#matrix;
  }

  setDirty() {
    this.#isDirty = true;
  }
}
