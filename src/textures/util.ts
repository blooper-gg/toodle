import { unzipSync } from "fflate";
import type {
  CpuTextureAtlas,
  TextureRegion,
  TextureWithMetadata,
} from "./types";

export async function getBitmapFromUrl(url: URL): Promise<ImageBitmap> {
  const response = await fetch(url);
  const blob = await response.blob();
  return await createImageBitmap(blob);
}

/**
 * Converts an image Blob to ImageData.
 *
 * @param blob - The Blob containing the image.
 * @returns A Promise resolving to the image as ImageData.
 */
async function blobToImageData(blob: Blob) {
  const imageBitmap: ImageBitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2D context from canvas");
  }

  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;

  ctx.drawImage(imageBitmap, 0, 0);

  const imageData: ImageData = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  imageBitmap.close();

  return imageData;
}

/**
 * Creates a checkerboard pattern ImageData in black and purple.
 *
 * @param width - Width of the image.
 * @param height - Height of the image.
 * @param tileSize - Size of each checker tile (default is 8).
 * @returns The generated ImageData object.
 */
function createCheckerboardImageData(
  width: number,
  height: number,
  tileSize = 8,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  const purple = [128, 0, 128, 255]; // #800080
  const black = [0, 0, 0, 255]; // #000000

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const usePurple =
        (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
      const color = usePurple ? purple : black;
      const idx = (y * width + x) * 4;

      data.set(color, idx);
    }
  }

  return new ImageData(data, width, height);
}

export async function loadZip(
  zipUrl: URL,
): Promise<{ path: string; bitmap: ImageBitmap }[]> {
  console.time("fetch zip");
  const zip = await fetch(zipUrl);
  const zipBlob = await zip.blob();
  const zipUint8Array = await zipBlob.arrayBuffer();
  console.timeEnd("fetch zip");

  console.time("unzip");
  const files = unzipSync(new Uint8Array(zipUint8Array));
  console.timeEnd("unzip");

  console.time("create bitmaps");
  const validFiles = Object.entries(files).filter(
    ([path]) => !path.match("__MACOS") && path.endsWith(".png"),
  );

  return await Promise.all(
    validFiles.map(async ([path, file]) => {
      const bitmap = await createImageBitmap(new Blob([file]));
      return { path, bitmap };
    }),
  );
}

export async function packBitmapsToAtlas(
  images: Map<string, TextureWithMetadata>,
  textureSize: number,
  device: GPUDevice,
): Promise<CpuTextureAtlas[]> {
  const cpuTextureAtlases: CpuTextureAtlas[] = [];
  const packed: PackedTexture[] = [];
  const spaces: Rectangle[] = [
    { x: 0, y: 0, width: textureSize, height: textureSize },
  ];

  let atlasRegionMap = new Map<string, TextureRegion>();

  for (const [id, { texture, drawOffset: offset, originalSize }] of images) {
    // Find best fitting space using guillotine method
    let bestSpace = -1;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < spaces.length; i++) {
      const space = spaces[i];
      if (texture.width <= space.width && texture.height <= space.height) {
        // Score based on how well it fits (smaller score is better)
        const score = Math.abs(
          space.width * space.height - texture.width * texture.height,
        );
        if (score < bestScore) {
          bestScore = score;
          bestSpace = i;
        }
      }
    }

    if (bestSpace === -1) {
      cpuTextureAtlases.push({
        texture: await createTextureAtlasTexture(device, packed, textureSize),
        textureRegions: atlasRegionMap,
      });

      atlasRegionMap = new Map<string, TextureRegion>();
      packed.length = 0;

      spaces.length = 0;
      spaces.push({
        x: 0,
        y: 0,
        width: textureSize,
        height: textureSize,
      });
      bestSpace = 0;
    }

    const space = spaces[bestSpace];

    // Pack the image
    packed.push(<PackedTexture>{
      texture: await textureToBitmap(
        device,
        texture,
        texture.width,
        texture.height,
      ),
      x: space.x,
      y: space.y,
      width: texture.width,
      height: texture.height,
    });

    texture.destroy();

    // Split remaining space into two new spaces
    spaces.splice(bestSpace, 1);

    if (space.width - texture.width > 0) {
      spaces.push({
        x: space.x + texture.width,
        y: space.y,
        width: space.width - texture.width,
        height: texture.height,
      });
    }

    if (space.height - texture.height > 0) {
      spaces.push({
        x: space.x,
        y: space.y + texture.height,
        width: space.width,
        height: space.height - texture.height,
      });
    }

    // Create atlas coords
    atlasRegionMap.set(id, {
      uvOffset: {
        x: space.x / textureSize,
        y: space.y / textureSize,
      },
      uvScale: {
        width: originalSize.width / textureSize,
        height: originalSize.height / textureSize,
      },
      uvScaleCropped: {
        width: texture.width / textureSize,
        height: texture.height / textureSize,
      },
      drawOffset: offset,
      originalSize,
    });
  }
  cpuTextureAtlases.push({
    texture: await createTextureAtlasTexture(device, packed, textureSize),
    textureRegions: atlasRegionMap,
  });

  return cpuTextureAtlases;
}

async function createTextureAtlasTexture(
  device: GPUDevice,
  packed: PackedTexture[],
  atlasSize: number,
) {
  const encoder: GPUCommandEncoder = device.createCommandEncoder();
  const atlasTexture: GPUTexture = device.createTexture({
    label: "Texture Atlas Texture Holder",
    size: [atlasSize, atlasSize, 1],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.COPY_SRC |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  for (const texture of packed) {
    device.queue.copyExternalImageToTexture(
      {
        source: texture.texture,
      },
      {
        texture: atlasTexture,
        origin: [texture.x, texture.y, 0],
      },
      [texture.width, texture.height, 1],
    );
  }
  device.queue.submit([encoder.finish()]);
  const atlasBitmap: ImageBitmap = await textureToBitmap(
    device,
    atlasTexture,
    atlasTexture.width,
    atlasTexture.height,
  );
  atlasTexture.destroy();
  return atlasBitmap;
}

/**
 * Converts a WebGPU GPUTexture into an ImageBitmap.
 *
 * @param {GPUDevice} device - The WebGPU device used to create GPU resources.
 * @param {GPUTexture} texture - The GPUTexture to convert. Must be in `rgba8unorm` format.
 * @param {number} width - The width of the texture in pixels.
 * @param {number} height - The height of the texture in pixels.
 * @returns {Promise<ImageBitmap>} A promise that resolves to an ImageBitmap containing the texture's contents.
 *
 * @example
 * const bitmap = await textureToBitmap(device, queue, myTexture, 256, 256);
 * const canvas = document.createElement("canvas");
 * const ctx = canvas.getContext("2d");
 * ctx.drawImage(bitmap, 0, 0);
 */
async function textureToBitmap(
  device: GPUDevice,
  texture: GPUTexture,
  width: number,
  height: number,
): Promise<ImageBitmap> {
  const bytesPerPixel = 4;
  const bytesPerRow = Math.ceil((width * bytesPerPixel) / 256) * 256;
  const bufferSize = bytesPerRow * height;

  const readBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const commandEncoder = device.createCommandEncoder();
  commandEncoder.copyTextureToBuffer(
    { texture: texture },
    {
      buffer: readBuffer,
      bytesPerRow: bytesPerRow,
      rowsPerImage: height,
    },
    {
      width: width,
      height: height,
      depthOrArrayLayers: 1,
    },
  );

  const commands = commandEncoder.finish();
  device.queue.submit([commands]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const arrayBuffer = readBuffer.getMappedRange();
  const data = new Uint8ClampedArray(arrayBuffer);

  const imageData = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const rowStart = y * bytesPerRow;
    const rowEnd = rowStart + width * 4;
    imageData.set(data.subarray(rowStart, rowEnd), y * width * 4);
  }

  const image = new ImageData(imageData, width, height);
  const bitmap = await createImageBitmap(image);

  readBuffer.unmap();
  return bitmap;
}

type PackedTexture = {
  texture: ImageBitmap;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};
