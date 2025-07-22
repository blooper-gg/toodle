import { type Mat3, mat3 } from "wgpu-matrix";
import type { Size } from "../coreTypes/Size";
import type { Vec2 } from "../coreTypes/Vec2";
import type { AtlasCoords } from "../textures/types";
import { assert } from "../utils/assert";
import type { Pool } from "../utils/pool";
import type { JumboQuadOptions } from "./QuadNode";
import { QuadNode } from "./QuadNode";
import type { SceneNode } from "./SceneNode";

const MAT3_SIZE = 12;
const VEC4F_SIZE = 4;

export class JumboQuadNode extends QuadNode {
  #atlasCoords: AtlasCoords[];
  #matrixPool: Pool<Mat3>;

  constructor(options: JumboQuadOptions, matrixPool: Pool<Mat3>) {
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

    super(
      {
        ...options,
        atlasCoords: options.atlasCoords[0],
      },
      matrixPool,
    );

    this.#atlasCoords = options.atlasCoords;
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
  get atlasCoords(): AtlasCoords {
    throw new Error("JumboQuadNode does not have a single atlas coords");
  }

  get jumboAtlasCoords(): AtlasCoords[] {
    return this.#atlasCoords;
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
  let tileOffset = 0;
  // Iterate through each IndexedAtlasCoordinate found in the coords...
  for (const coord of node.jumboAtlasCoords) {
    // write model matrix
    array.set(node.matrixWithSize, offset + tileOffset);
    tileOffset += MAT3_SIZE;

    // write tint color
    array.set(
      [node.color.r, node.color.g, node.color.b, node.color.a],
      offset + tileOffset,
    );
    //...increment the local offset by the size of our color vector
    tileOffset += VEC4F_SIZE;

    // write uv offset and scale
    // location 4 are the uv offset and scale used to sample the texture atlas. these are in normalized texel coordinates.
    // @location(4) uvOffsetAndScale: vec4<f32>,
    array.set(
      [
        coord.uvOffset.x,
        coord.uvOffset.y,
        coord.uvScale.width,
        coord.uvScale.height,
      ],
      offset + tileOffset,
    );
    tileOffset += VEC4F_SIZE;

    // write crop offset and scale
    // location 5 is the crop offset from center and scale. These are ratios applied to the unit quad.
    // @location(5) cropOffsetAndScale: vec4<f32>,
    array.set(
      [
        coord.uvOffset.x / (coord.originalSize.width || 1),
        coord.uvOffset.y / (coord.originalSize.height || 1),
        // TODO: make this work for cropped textures
        1,
        1,
      ],
      offset + tileOffset,
    );
    tileOffset += VEC4F_SIZE;

    // write atlas index
    new DataView(array.buffer).setUint32(
      array.byteOffset + (offset + tileOffset) * Float32Array.BYTES_PER_ELEMENT,
      coord.atlasIndex,
      true,
    );
    tileOffset += VEC4F_SIZE;
  }
  // Write our instance and return the number of sprites added to the buffer...
  node.writeInstance?.(array, offset + tileOffset);
  return node.jumboAtlasCoords.length;
}
