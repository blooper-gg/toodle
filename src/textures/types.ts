// types.ts should exclusively contain typescript types and no runtime js code.
// that way it is safe to import/export for consumers
// without accidentally including browser code via tree-shaking.

import type { Size, Vec2 } from "../coreTypes/mod";

export type AtlasCoords = TextureRegion & {
  atlasIndex: number;
};

export type TextureRegion = UvRegion & {
  drawOffset: Vec2;
  originalSize: Size;
};

export type UvRegion = {
  /**
   * The offset of the UVs in normalized texels. Relative to the un-cropped texture.
   *
   * @example
   *
   * { x: 10 / 4096, y: 10 / 4096 }
   */
  uvOffset: Vec2;
  /**
   * The scale of the UVs in normalized texels. Derived from the width and height of the un-cropped texture.
   *
   * @example
   *
   * { width: 1 / 4096, height: 1 / 4096 }
   */
  uvScale: Size;
  /**
   * The scale of the UVs in normalized texels. Derived from the width and height of the cropped texture.
   *
   * @example
   *
   * { width: 1 / 4096, height: 1 / 4096 }
   */
  uvScaleCropped?: Size;
};

export type CpuTextureAtlas = {
  texture: ImageBitmap;
  textureRegions: Map<string, TextureRegion>;
};

export type TextureWithMetadata = {
  texture: GPUTexture;
  /** draw offset from center in texel units */
  drawOffset: Vec2;
  /** original size in texel units before cropping */
  originalSize: Size;
};

export type BundleOpts = {
  /**
   * A record of texture ids and URLs.
   * ids must be unique within a bundle
   *
   */
  textures: Record<string, URL>;
  /**
   * Whether the image should be cropped down to the minimal bounding box for non-transparent pixels.
   *
   * See [Transparent Pixel Cropping](https://toodle.void.dev/f849595b3ed13fc956fc1459a5cb5f0228f9d259/examples/transparent-cropping.html) for more information.
   */
  cropTransparentPixels?: boolean;
  /**
   * Whether the bundle should be loaded automatically on registration
   */
  autoLoad?: boolean;
};
