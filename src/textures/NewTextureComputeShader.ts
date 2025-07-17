import type { Point } from "../coreTypes/Point";
import type { Size } from "../coreTypes/Size";
import { OneOrMany } from "../utils/one_or_many";
import computeShader from "./texture-processing.wgsl";
import type { ImageWithMetaData, TextureRegion } from "./types";
import { textureToBitmap } from "./util";

// Constants
const BOUNDING_BOX_SIZE = 5 * Uint32Array.BYTES_PER_ELEMENT;
const BOUNDS_CHECK_ORIGIN_SIZE = 4 * Uint32Array.BYTES_PER_ELEMENT;
const WORKGROUP_SIZE = 8;
const MAX_BOUND = 0xffffffff;
const MIN_BOUND = 0x00000000;

/**
 * The data returned by the compute shader that represents the opaque pixels in a texture.
 * Texel coordinates start at 0,0 in the top-left corner of the texture.
 */
type OpaqueRect = {
  /** The leftmost texel coordinate of the bounding box. */
  texelX: number;
  /** The topmost texel coordinate of the bounding box. */
  texelY: number;
  /** The width of the bounding box in texels. */
  texelWidth: number;
  /** The height of the bounding box in texels. */
  texelHeight: number;
};

/**
 * A GPU-based texture processor that uses compute shaders to:
 * 1. Find the non-transparent bounding box in a texture.
 * 2. Crop the texture to that bounding box.
 * 3. Create a fallback texture if no non-transparent pixels are found.
 * 4. Slice a target texture that exceeds normal atlas bounds into subsections for packing.
 */
export class TextureComputeShader {
  #device: GPUDevice;
  #boundingBuffer: GPUBuffer;
  #cropPipeline: GPUComputePipeline;
  #boundPipeline: GPUComputePipeline;
  #missingTexturePipeline: GPUComputePipeline;

  constructor(
    device: GPUDevice,
    cropPipeline: GPUComputePipeline,
    boundPipeline: GPUComputePipeline,
    missingTexturePipeline: GPUComputePipeline,
  ) {
    this.#device = device;
    this.#boundPipeline = boundPipeline;
    this.#cropPipeline = cropPipeline;
    this.#missingTexturePipeline = missingTexturePipeline;

    // Buffer to store the computed bounding box [minX, minY, maxX, maxY]
    this.#boundingBuffer = this.#device.createBuffer({
      size: BOUNDING_BOX_SIZE,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
  }

  /**
   * Factory method to initialize pipelines and return an instance of TextureComputeShader.
   */
  static create(device: GPUDevice) {
    const pipelines = createPipelines(device, "TextureComputeShader");
    return new TextureComputeShader(
      device,
      pipelines.cropPipeline,
      pipelines.boundPipeline,
      pipelines.missingTexturePipeline,
    );
  }

  /**
   * Main entry point to tile an extra large texture into atlas ready chunks.
   * Returns a TextureWrapper with all the constituent parts.
   */
  async tileImage(
    texture: GPUTexture,
    original: ImageWithMetaData,
    maxTextureSize: number,
    layer: number,
    position: Point = { x: 0, y: 0 },
  ): Promise<OneOrMany<ImageWithMetaData>> {
    const inputTexture: GPUTexture = texture;
    const totalWidth = original.bitmap.width;
    const totalHeight = original.bitmap.height;
    const tileImages: OneOrMany<ImageBitmap> = new OneOrMany<ImageBitmap>();
    const tileOffsets: OneOrMany<Point> = new OneOrMany<Point>();

    let remainingImageArea = totalWidth * totalHeight;

    let offsetMarker: Point = original.coordinates.one.drawOffset;

    let xOffset = 0;
    let yOffset = 0;

    let currentMaxTileWidth = maxTextureSize;
    let currentMaxTileHeight = maxTextureSize;
    let currentWidth = totalWidth;
    let currentHeight = totalHeight;

    tileOffsets.push(offsetMarker);

    while (remainingImageArea > 0) {
      currentMaxTileWidth =
        currentMaxTileWidth > 0 ? currentMaxTileWidth : maxTextureSize;
      currentMaxTileHeight =
        currentMaxTileHeight > 0 ? currentMaxTileHeight : maxTextureSize;

      const tileWidth = Math.min(currentMaxTileWidth, currentWidth);
      const tileHeight = Math.min(currentMaxTileHeight, currentHeight);

      const boundsData: Uint32Array<ArrayBuffer> = Uint32Array.from([
        xOffset + position.x,
        yOffset + position.y,
        tileWidth + xOffset + position.x,
        tileHeight + yOffset + position.y,
        layer,
      ]);

      const tileImage: ImageBitmap = await this.#cropTexture(
        tileWidth,
        tileHeight,
        boundsData,
        inputTexture,
      );

      offsetMarker = {
        x:
          tileWidth + offsetMarker.x >= totalWidth
            ? offsetMarker.x
            : tileWidth / 2 + offsetMarker.x,
        y:
          tileHeight + offsetMarker.y >= totalHeight
            ? offsetMarker.y
            : tileHeight / 2 + offsetMarker.y,
      };

      tileImages.push(tileImage);
      currentWidth -= tileWidth;

      if (currentWidth <= 0) {
        currentWidth = totalWidth;
        currentHeight -= tileHeight;
      }

      xOffset = tileWidth + xOffset >= totalWidth ? 0 : tileWidth + xOffset;
      yOffset = tileHeight + yOffset >= totalHeight ? 0 : tileHeight + yOffset;

      // If we have already calculated initial offsets push...
      if (remainingImageArea !== totalHeight * totalWidth) {
        tileOffsets.push(offsetMarker);
      }

      remainingImageArea -= tileWidth * tileHeight;
    }

    const tiledImages: OneOrMany<ImageWithMetaData> =
      new OneOrMany<ImageWithMetaData>();

    tileImages.map((image) => {
      tiledImages.push({
        bitmap: image,
        coordinates: new OneOrMany<TextureRegion>({
          drawOffset: tileOffsets.popLeft() ?? { x: 0, y: 0 },
          originalSize: {
            width: original.bitmap.width,
            height: original.bitmap.height,
          },
          croppedSize: { width: image.width, height: image.height },
          uvOffset: { x: 0, y: 0 },
          uvScale: { width: 0, height: 0 },
        }),
      });
    });

    return tiledImages;
  }

  /**
   * Main entry point to crop transparency from a texture.
   * Returns a cropped ImageBitmap and metadata.
   */
  async cropTransparency(
    texture: GPUTexture,
    imageSize: Size,
    layer: number,
    origin: Point = { x: 0, y: 0 },
  ): Promise<ImageWithMetaData> {
    const boundsOriginUniform = this.#device.createBuffer({
      label: "Bounds Location Buffer",
      size: BOUNDS_CHECK_ORIGIN_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.#device.queue.writeBuffer(
      boundsOriginUniform,
      0,
      new Uint32Array([origin.x, origin.y, imageSize.width, imageSize.height]),
    );

    const boundsBindGroup = this.#boundsBindGroup(boundsOriginUniform, texture);

    const commandEncoder = this.#device.createCommandEncoder({
      label: "Crop Pass Transparency Encoder",
    });
    const passEncoder = commandEncoder.beginComputePass();

    const dispatchX = Math.ceil(imageSize.width / WORKGROUP_SIZE);
    const dispatchY = Math.ceil(imageSize.height / WORKGROUP_SIZE);

    // Initialize bounding box with max/min values
    const boundsInit = new Uint32Array([
      MAX_BOUND,
      MAX_BOUND,
      MIN_BOUND,
      MIN_BOUND,
      layer,
    ]);

    this.#device.queue.writeBuffer(
      this.#boundingBuffer,
      0,
      boundsInit.buffer,
      0,
      BOUNDING_BOX_SIZE,
    );
    // Run bounds detection compute shader
    passEncoder.setPipeline(this.#boundPipeline);
    passEncoder.setBindGroup(0, boundsBindGroup);
    passEncoder.dispatchWorkgroups(dispatchX, dispatchY);
    passEncoder.end();
    this.#device.queue.submit([commandEncoder.finish()]);

    const { texelX, texelY, texelWidth, texelHeight, computeBuffer } =
      await this.#getBoundingBox();

    // If no non-transparent pixels were found
    if (texelX === MAX_BOUND || texelY === MAX_BOUND) {
      return await this.#createMissingTexture(texture);
    }

    // Crop the texture to the computed bounds
    const croppedBitmap: ImageBitmap = await this.#cropTexture(
      texelWidth,
      texelHeight,
      computeBuffer,
      texture,
    );

    const leftCrop = texelX;
    const rightCrop = imageSize.width - texelX - texelWidth;
    const topCrop = texelY;
    const bottomCrop = imageSize.height - texelY - texelHeight;

    return {
      bitmap: croppedBitmap,
      coordinates: new OneOrMany<TextureRegion>({
        drawOffset: {
          x: leftCrop - rightCrop,
          y: bottomCrop - topCrop,
        },
        originalSize: imageSize,
        uvOffset: { x: 0, y: 0 },
        uvScale: { width: 1, height: 1 },
        croppedSize: { width: texelWidth, height: texelHeight },
      }),
    };
  }

  /**
   * Reads the GPU buffer containing the bounding box.
   */
  async #getBoundingBox(): Promise<
    OpaqueRect & { computeBuffer: Uint32Array }
  > {
    const readBuffer = this.#device.createBuffer({
      label: "AABB Compute Buffer",
      size: BOUNDING_BOX_SIZE,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const copyEncoder = this.#device.createCommandEncoder({
      label: "Copy Bounds Encoder",
    });
    copyEncoder.copyBufferToBuffer(
      this.#boundingBuffer,
      0,
      readBuffer,
      0,
      BOUNDING_BOX_SIZE,
    );
    this.#device.queue.submit([copyEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const computeBuffer = new Uint32Array(readBuffer.getMappedRange().slice(0));
    readBuffer.unmap();
    readBuffer.destroy();
    const [minX, minY, maxX, maxY] = computeBuffer;
    return {
      texelX: minX,
      texelY: minY,
      texelWidth: maxX - minX + 1,
      texelHeight: maxY - minY + 1,
      computeBuffer,
    };
  }

  /**
   * Crops the original texture to the specified bounds using a compute shader.
   */
  async #cropTexture(
    croppedWidth: number,
    croppedHeight: number,
    computeBuffer: Uint32Array,
    inputTexture: GPUTexture,
  ): Promise<ImageBitmap> {
    const boundsUniform = this.#device.createBuffer({
      label: "Cropping Bounds Uniform Buffer",
      size: BOUNDING_BOX_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.#device.queue.writeBuffer(boundsUniform, 0, computeBuffer);

    const outputTexture = this.#device.createTexture({
      label: "Cropped Texture",
      size: [croppedWidth, croppedHeight],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });

    const bindGroup = this.#croppingBindGroup(
      inputTexture,
      outputTexture,
      boundsUniform,
      computeBuffer[4],
    );

    const encoder = this.#device.createCommandEncoder({
      label: "Crop Pass Encoder",
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.#cropPipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(croppedWidth / WORKGROUP_SIZE),
      Math.ceil(croppedHeight / WORKGROUP_SIZE),
    );
    pass.end();

    this.#device.queue.submit([encoder.finish()]);
    return textureToBitmap(outputTexture, this.#device);
  }

  /**
   * Creates a fallback placeholder texture if the input is fully transparent.
   */
  async #createMissingTexture(
    inputTexture: GPUTexture,
  ): Promise<ImageWithMetaData> {
    const placeholder = this.#device.createTexture({
      label: "Missing Placeholder Texture",
      size: [inputTexture.width, inputTexture.height],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING,
    });

    const encoder = this.#device.createCommandEncoder({
      label: "Missing Texture Encoder",
    });
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.#missingTexturePipeline);
    pass.setBindGroup(0, this.#missingTextureBindGroup(placeholder));
    pass.dispatchWorkgroups(placeholder.width / 8, placeholder.height / 8);
    pass.end();
    this.#device.queue.submit([encoder.finish()]);

    const placeholderBitmap: ImageBitmap = await textureToBitmap(
      placeholder,
      this.#device,
    );

    return {
      bitmap: placeholderBitmap,
      coordinates: new OneOrMany<TextureRegion>({
        originalSize: {
          width: inputTexture.width,
          height: inputTexture.height,
        },
        uvOffset: { x: 0, y: 0 },
        uvScale: { width: 1, height: 1 },
        croppedSize: { width: inputTexture.width, height: inputTexture.height },
        drawOffset: { x: 0, y: 0 },
      }),
    };
  }

  // Bind group helpers

  #boundsBindGroup(
    originUniform: GPUBuffer,
    inputTexture: GPUTexture,
  ): GPUBindGroup {
    return this.#device.createBindGroup({
      layout: this.#boundPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: inputTexture.createView(),
        },
        { binding: 1, resource: { buffer: this.#boundingBuffer } },
        { binding: 2, resource: { buffer: originUniform } },
      ],
    });
  }

  #croppingBindGroup(
    inputTexture: GPUTexture,
    outputTexture: GPUTexture,
    boundsUniform: GPUBuffer,
    inputLayer: number,
  ): GPUBindGroup {
    return this.#device.createBindGroup({
      layout: this.#cropPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: inputTexture.createView({
            dimension: "2d",
            baseArrayLayer: inputLayer,
            arrayLayerCount: 1,
          }),
        },
        {
          binding: 1,
          resource: outputTexture.createView({
            dimension: "2d",
          }),
        },
        { binding: 2, resource: { buffer: boundsUniform } },
      ],
    });
  }

  #missingTextureBindGroup(outputTexture: GPUTexture): GPUBindGroup {
    return this.#device.createBindGroup({
      layout: this.#missingTexturePipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: outputTexture.createView() }],
    });
  }
}

/**
 * Creates compute pipelines for bounding box detection, cropping, and fallback texture generation.
 */
function createPipelines(device: GPUDevice, label: string) {
  const shader = device.createShaderModule({
    label: `${label} Shader`,
    code: computeShader,
  });

  const findBoundsBindGroupLayout = device.createBindGroupLayout({
    label: "Bounds Detection Layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: "float", viewDimension: "2d-array" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });

  const cropBindGroupLayout = device.createBindGroupLayout({
    label: "Cropping Layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        texture: { viewDimension: "2d" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "write-only",
          format: "rgba8unorm",
          viewDimension: "2d",
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });

  const missingTextureBindGroupLayout = device.createBindGroupLayout({
    label: "Missing Texture Layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "write-only",
          format: "rgba8unorm",
          viewDimension: "2d",
        },
      },
    ],
  });

  return {
    boundPipeline: device.createComputePipeline({
      label: `${label} - Find Bounds Pipeline`,
      layout: device.createPipelineLayout({
        bindGroupLayouts: [findBoundsBindGroupLayout],
      }),
      compute: { module: shader, entryPoint: "find_bounds" },
    }),
    cropPipeline: device.createComputePipeline({
      label: `${label} - Crop Pipeline`,
      layout: device.createPipelineLayout({
        bindGroupLayouts: [cropBindGroupLayout],
      }),
      compute: { module: shader, entryPoint: "crop_and_output" },
    }),
    missingTexturePipeline: device.createComputePipeline({
      label: `${label} - Missing Texture Pipeline`,
      layout: device.createPipelineLayout({
        bindGroupLayouts: [missingTextureBindGroupLayout],
      }),
      compute: { module: shader, entryPoint: "missing_texture" },
    }),
  };
}
