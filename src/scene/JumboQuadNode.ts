import { type Mat3, mat3 } from "wgpu-matrix";
import type { Size } from "../coreTypes/Size";
import type { Vec2 } from "../coreTypes/Vec2";
import type { AtlasCoords } from "../textures/types";
import { assert } from "../utils/assert";
import { OneOrMany } from "../utils/one_or_many";
import type { Pool } from "../utils/pool";
import { QuadNode } from "./QuadNode";
import type { QuadOptions } from "./QuadNode";
import type { SceneNode } from "./SceneNode";

const MAT3_SIZE = 12;
const VEC4F_SIZE = 4;

export class JumboQuadNode extends QuadNode {
  #matrixPool: Pool<Mat3>;
  #atlasCoords: OneOrMany<AtlasCoords>;

  constructor(options: QuadOptions, matrixPool: Pool<Mat3>) {
    assert(
      options.shader,
      "JumboQuadNode requires a shader to be explicitly provided",
    );

    assert(
      options.atlasCoords,
      "QuadNode requires atlas coords to be explicitly provided",
    );

    options.render ??= {
      shader: options.shader,
      writeInstance: writeJumboQuadInstance,
    };

    const atlasCoords: OneOrMany<AtlasCoords> = options.atlasCoords;

    options.atlasCoords = new OneOrMany<AtlasCoords>(atlasCoords.one);

    super(options, matrixPool);

    this.#atlasCoords = atlasCoords;
    this.#matrixPool = matrixPool;
  }

  /**
   * Creates a model matrix for tiled texture components. This is specific to the individually tiled texture.
   * Each component is scaled according to its original size.
   * @param coords AtlasCoords of the texture tile.
   */
  getTileMatrix(coords: AtlasCoords) {
    const matrix = mat3.clone(this.matrix, this.#matrixPool.get());
    const flipValues: Vec2 = {
      x: this.flipX ? -1 : 1,
      y: this.flipY ? -1 : 1,
    };
    const componentRatio: Size = {
      width: coords.croppedSize.width / coords.originalSize.width,
      height: coords.croppedSize.height / coords.originalSize.height,
    };

    return mat3.scale(matrix, [
      this.size.width * componentRatio.width * flipValues.x,
      this.size.height * componentRatio.height * flipValues.y,
    ]);
  }

  /**
   * The atlas coordinates for the quad. These determine the region in the texture atlas
   * that is sampled for rendering.
   */
  get atlasCoords(): AtlasCoords[] {
    return this.#atlasCoords.many;
  }

  /**
   * Returns a list of all atlas indices used by the Node.
   */
  get atlasIndices(): number[] {
    const indices: number[] = [];
    for (const coord of this.#atlasCoords) {
      indices.push(coord.atlasIndex);
    }
    return indices;
  }

  /**
   * Sets the atlas coords for the quad. This is for advanced use cases and by default these are
   * set automatically to reference the right texture atlas region.
   * @param value - The new atlas coords.
   */
  setAtlasCoords(value: OneOrMany<AtlasCoords>) {
    this.#atlasCoords = value;
  }
}

function writeJumboQuadInstance(
  node: SceneNode,
  array: Float32Array,
  offset: number,
): number {
  if (!(node instanceof JumboQuadNode)) {
    throw new Error(
      "JumboQuadNode.writeJumboQuadInstance can only be called on JumboQuadNodes",
    );
  }

  // Initialize the local offset for each tile to render...
  let tileComponentOffset = 0;
  // Iterate through each IndexedAtlasCoordinate found in the coords...
  for (const coord of node.atlasCoords) {
    array.set(node.getTileMatrix(coord), offset + tileComponentOffset);
    // Increment the local offset by the size of our transformation matrix...
    tileComponentOffset += MAT3_SIZE;

    array.set(
      [node.color.r, node.color.g, node.color.b, node.color.a],
      offset + tileComponentOffset,
    );
    //...increment the local offset by the size of our color vector
    tileComponentOffset += VEC4F_SIZE;

    array.set(
      [
        coord.uvOffset.x,
        coord.uvOffset.y,
        coord.uvScale.width,
        coord.uvScale.height,
      ],
      offset + tileComponentOffset,
    );
    // Increment by the size of our uv components.
    tileComponentOffset += VEC4F_SIZE;

    array.set(
      [
        (node.drawOffset.x / 2 + coord.drawOffset.x) /
          (coord.croppedSize.width || 1),
        (node.drawOffset.y / 2 - coord.drawOffset.y) /
          (coord.croppedSize.height || 1),
        node.extra.cropRatio().width,
        node.extra.cropRatio().height,
      ],
      offset + tileComponentOffset,
    );

    tileComponentOffset += VEC4F_SIZE;

    new DataView(array.buffer).setUint32(
      array.byteOffset +
        (offset + tileComponentOffset) * Float32Array.BYTES_PER_ELEMENT,
      coord.atlasIndex,
      true,
    );
    // Increment by our indexing value
    tileComponentOffset += VEC4F_SIZE;
  }
  // Write our instance and return the number of sprites added to the buffer...
  node.writeInstance?.(array, offset + tileComponentOffset);
  return node.atlasCoords.length;
}
