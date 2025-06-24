export const DEFAULT_LIMITS = {
  /** Maximum number of rendered instances in the scene per frame */
  instanceCount: 1024 * 2,
  /** Maximum number of unique z-indexes in the scene */
  zIndex: 32,
  /** Maximum number of vfx shaders */
  shaderCount: 32,
  /** Maximum dimensions of a single texture */
  textureSize: 1024 * 4,
  /** Maximum number of layers in a texture array */
  textureArrayLayers: 64,
  /** Maximum size of uniforms buffer */
  uniformBufferSize: 1024 * 64,
  /** Maximum number of instance buffer fields - 16 minus the vertex locations used by the engine */
  instanceBufferFields: 16 - 6,
  /** Maximum size of instance buffer */
  instanceBufferSize: Float32Array.BYTES_PER_ELEMENT * 4 * (16 - 6),
  /** Maximum length of a single piece of text */
  maxTextLength: 256,
};

export type Limits = typeof DEFAULT_LIMITS;
export type LimitsOptions = Partial<Limits>;
