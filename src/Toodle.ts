import { type Mat3, mat3 } from "wgpu-matrix";
import type { Color } from "./coreTypes/Color";
import type { Point } from "./coreTypes/Point";
import type { Size } from "./coreTypes/Size";
import type { Limits, LimitsOptions } from "./limits";
import { DEFAULT_LIMITS } from "./limits";
import {
  convertScreenToWorld,
  convertWorldToScreen,
  createProjectionMatrix,
} from "./math/matrix";
import { Batcher } from "./scene/Batcher";
import { Camera } from "./scene/Camera";
import { JumboQuadNode, type JumboQuadOptions } from "./scene/JumboQuadNode";
import { QuadNode, type QuadOptions } from "./scene/QuadNode";
import { type NodeOptions, SceneNode } from "./scene/SceneNode";
import type { Resolution } from "./screen/resolution";
import type { EngineUniform } from "./shaders/EngineUniform";
import type { IShader } from "./shaders/IShader";
import { QuadShader } from "./shaders/QuadShader";
import { TextNode, type TextOptions } from "./text/TextNode";
import { AssetManager, type TextureId } from "./textures/AssetManager";
import { initGpu } from "./utils/boilerplate";
import { assert, Pool } from "./utils/mod";

export class Toodle {
  /**
   * Asset manager. Use toodle.assets.loadTexture to load texture assets.
   */
  assets: AssetManager;

  /**
   * diagnostics can be used as a rough gauge for performance.
   * besides frames, these stats are reset at the beginning of each frame.
   */
  diagnostics = {
    /** number of instanced draw calls issued last frame. lower is better */
    drawCalls: 0,
    /** number of pipeline switches last frame. lower is better. to reduce pipeline switches, use fewer z-indexes or fewer custom shaders */
    pipelineSwitches: 0,
    /** number of frames rendered */
    frames: 0,
    /** number of instances enqueued last frame */
    instancesEnqueued: 0,
  };

  /** sometimes for debugging you might want to access the GPU device, this should not be necessary in normal operation */
  debug: { device: GPUDevice; presentationFormat: GPUTextureFormat };

  /**
   * Camera. This applies a 2d perspective projection matrix to any nodes drawn with toodle.draw
   */
  camera = new Camera();

  /**
   * clearColor is the color that will be used to clear the screen at the beginning of each frame
   * you can also think of this as the background color of the canvas
   */
  clearColor: Color = { r: 1, g: 1, b: 1, a: 1 };

  #resolution: Resolution;
  #resizeObserver: ResizeObserver;
  #engineUniform: EngineUniform;
  #projectionMatrix: Mat3 = mat3.identity();
  #batcher = new Batcher();
  #limits: Limits;
  #device: GPUDevice;
  #context: GPUCanvasContext;
  #presentationFormat: GPUTextureFormat;
  #renderPass?: GPURenderPassEncoder;
  #encoder?: GPUCommandEncoder;
  #defaultFilter: GPUFilterMode;
  #matrixPool: Pool<Mat3>;
  #atlasSize: Size;

  /**
   * it's unlikely that you want to use the constructor directly.
   * see {@link Toodle.attach} for creating a Toodle instance that draws to a canvas.
   */
  constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    presentationFormat: GPUTextureFormat,
    canvas: HTMLCanvasElement,
    resolution: Resolution,
    options: ToodleOptions,
  ) {
    this.#limits = {
      ...DEFAULT_LIMITS,
      ...options.limits,
    };
    this.#matrixPool = new Pool<Mat3>(
      () => mat3.identity(),
      this.#limits.instanceCount,
    );
    this.#device = device;
    this.#context = context;
    this.#presentationFormat = presentationFormat;
    this.#defaultFilter = options.filter ?? "linear";
    this.assets = new AssetManager(device, presentationFormat, this.#limits);
    this.#atlasSize = {
      width: this.assets.textureAtlas.width,
      height: this.assets.textureAtlas.height,
    };
    this.debug = { device, presentationFormat };
    this.#engineUniform = {
      resolution,
      camera: this.camera,
      viewProjectionMatrix: mat3.identity(),
    };
    this.#resolution = resolution;

    this.resize(this.#resolution);

    this.#resizeObserver = this.#createResizeObserver(canvas);
  }

  /**
   * call resize when the canvas is resized.
   * this will update the projection matrix and the resolution.
   *
   * @param resolution - the resolution of the canvas in logical pixels.
   * this should be `canvas.clientWidth x canvas.clientHeight` and NOT `canvas.width * canvas.height`
   *
   * @example
   *
   *  const canvas = document.querySelector("canvas")!
   *
   *  const observer = new ResizeObserver((entries) => {
   *   if (entries.length === 0) return
   *   toodle.resize({ width: canvas.clientWidth, height: canvas.clientHeight })
   *  })
   *
   *  observer.observe(canvas)
   */
  resize(resolution: Resolution) {
    createProjectionMatrix(resolution, this.#projectionMatrix);
    this.#resolution = resolution;
  }

  #createResizeObserver(canvas: HTMLCanvasElement) {
    // see https://webgpufundamentals.org/webgpu/lessons/webgpu-resizing-the-canvas.html
    // for explanation of incorporating devicePixelRatio
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || !entries.length) return;
      for (const entry of entries) {
        const width =
          entry.devicePixelContentBoxSize?.[0].inlineSize ||
          entry.contentBoxSize[0].inlineSize * devicePixelRatio;
        const height =
          entry.devicePixelContentBoxSize?.[0].blockSize ||
          entry.contentBoxSize[0].blockSize * devicePixelRatio;

        // uncomment these lines to debug issues with high dpi monitors
        // and OS zoom
        //
        // const rect = entry.target.getBoundingClientRect();
        // console.table({
        //   width,
        //   clientWidth: canvas.clientWidth,
        //   contentBoxInlineSize: entry.contentBoxSize[0].inlineSize,
        //   rectWidth: rect.width,
        //   height,
        //   clientHeight: canvas.clientHeight,
        //   contentBoxBlockSize: entry.contentBoxSize[0].blockSize,
        //   rectHeight: rect.height,
        // });

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
        }
        this.resize({ width: canvas.clientWidth, height: canvas.clientHeight });
      }
    });
    try {
      resizeObserver.observe(canvas, { box: "device-pixel-content-box" });
    } catch {
      resizeObserver.observe(canvas);
    }
    return resizeObserver;
  }

  /**
   * The resolution of the canvas in css or logical pixels.
   *
   * @example
   *
   * // devicePixelRatio is 1, resolution is 200x200
   * <canvas width="200" height="200" style="width: 200px; height: 200px;"></canvas>
   * // devicePixelRatio is 2, resolution is 100x100
   * <canvas width="200" height="200" style="width: 100px; height: 100px;"></canvas>
   */
  get resolution() {
    return this.#resolution;
  }

  /**
   * Returns the currently configured Toodle engine limits
   *
   * See: https://toodle.gg/f849595b3ed13fc956fc1459a5cb5f0228f9d259/limits.html
   *
   * @example
   *
   * const instanceLimit: number = toodle.limits.instanceCount;
   */
  get limits(): Limits {
    return this.#limits;
  }

  get batcher(): Batcher {
    return this.#batcher;
  }

  /**
   * The maximum number of pixels that can be loaded into texture atlases for this toodle instance.
   */
  get maxPixels() {
    return (
      this.#limits.textureSize *
      this.#limits.textureSize *
      this.#limits.textureArrayLayers
    );
  }

  /**
   * The maximum amount of GPU memory that will be used by the Toodle instance.
   * This is a rough estimate and may not be exact. This will be allocated up front when calling Toodle.attach, and freed when calling toodle.destroy.
   */
  get maxGpuMemory() {
    return (
      this.#limits.instanceCount *
      this.#limits.instanceBufferSize *
      this.#limits.shaderCount
    );
  }

  /**
   * call startFrame before drawing anything.
   * this will create a new encoder and render pass.
   *
   * @example
   *
   * toodle.startFrame();
   * // draw stuff
   * toodle.endFrame();
   */
  startFrame(options?: StartFrameOptions) {
    this.#encoder = this.#device.createCommandEncoder();
    this.#renderPass = this.#encoder.beginRenderPass({
      label: `toodle frame ${this.diagnostics.frames}`,
      colorAttachments: [
        {
          view: this.#context.getCurrentTexture().createView(),
          clearValue: this.clearColor,
          loadOp: options?.loadOp ?? "clear",
          storeOp: "store",
        },
      ],
    });

    this.diagnostics.drawCalls =
      this.diagnostics.pipelineSwitches =
      this.diagnostics.instancesEnqueued =
        0;
  }

  /**
   * call draw in between start frame and end frame to enqueue an instanced draw call.
   *
   * @example
   *
   * toodle.assets.loadTexture("myImage", "assets/image.png");
   * const quad = toodle.Quad("myImage");
   *
   * toodle.startFrame();
   * toodle.draw(quad);
   * toodle.endFrame();
   */
  draw(node: SceneNode) {
    this.assets.validateTextureReference(node);
    this.#batcher.enqueue(node);
  }

  /**
   * call end frame to run through enqueued draw calls and submit them to the GPU.
   *
   * @example
   *
   * toodle.startFrame();
   * // draw stuff
   * toodle.endFrame();
   */
  endFrame() {
    assert(
      this.#renderPass,
      "no render pass found. have you called startFrame?",
    );
    assert(this.#encoder, "no encoder found. have you called startFrame?");

    mat3.mul(
      this.#projectionMatrix,
      this.camera.matrix,
      this.#engineUniform.viewProjectionMatrix,
    );
    this.#engineUniform.resolution = this.#resolution;
    for (const pipeline of this.#batcher.pipelines) {
      pipeline.shader.startFrame(this.#device, this.#engineUniform);
    }

    this.diagnostics.instancesEnqueued = this.#batcher.nodes.length;
    if (this.#batcher.nodes.length > this.#limits.instanceCount) {
      const err = new Error(
        `ToodleInstanceCap: ${this.batcher.nodes.length} instances enqueued, max is ${this.limits.instanceCount}`,
      );
      err.name = "ToodleInstanceCap";
      throw err;
    }

    for (const layer of this.#batcher.layers) {
      for (const pipeline of layer.pipelines) {
        this.diagnostics.pipelineSwitches++;
        this.diagnostics.drawCalls += pipeline.shader.processBatch(
          this.#renderPass,
          pipeline.nodes,
        );
      }
    }

    for (const pipeline of this.#batcher.pipelines) {
      pipeline.shader.endFrame();
    }

    this.#renderPass.end();
    this.#device.queue.submit([this.#encoder.finish()]);
    this.#batcher.flush();
    this.#matrixPool.free();
    this.diagnostics.frames++;
  }

  /**
   * Convert a point from one coordinate space to another.
   *
   * @param point - The point to convert.
   * @param options - The options for the conversion.
   * @returns The converted point.
   */
  convertSpace(
    point: Point,
    options: { from: "screen" | "world"; to: "world" | "screen" },
  ): Point {
    if (options.from === "screen" && options.to === "world") {
      return convertScreenToWorld(
        point,
        this.camera,
        this.#projectionMatrix,
        this.#resolution,
      );
    }

    if (options.from === "world" && options.to === "screen") {
      return convertWorldToScreen(
        point,
        this.camera,
        this.#projectionMatrix,
        this.#resolution,
      );
    }

    if (options.from === options.to) {
      return point;
    }

    throw new Error(
      `Unknown conversion from: ${options.from} to: ${options.to}`,
    );
  }

  /**
   * The number of frames rendered since this Toodle instance was created.
   */
  get frameCount() {
    return this.diagnostics.frames;
  }

  /**
   * Create a custom shader for quad instances. In some engines, this might be called a material.
   *
   * @param label Debug name of the shader
   * @param instanceCount - The maximum number of instances that will be processed by the shader. Note that a worst-case buffer of this many instances will be immediately allocated.
   * @param userCode - The WGSL code to be used for the shader.
   * @param blendMode - The blend mode to be used for the shader.
   *
   * @example
   *
   *
   */
  QuadShader(
    label: string,
    instanceCount: number,
    userCode: string,
    blendMode?: GPUBlendState,
  ) {
    return new QuadShader(
      label,
      this.assets,
      this.#device,
      this.#presentationFormat,
      userCode,
      instanceCount,
      blendMode,
    );
  }

  /**
   * Create a new quad node.
   *
   * @param assetId - The ID of the asset to use for the quad. This must have been loaded with toodle.assets.loadBundle.
   *
   * @param options - QuadOptions for Quad creation
   * @param options
   * @example
   *
   * await toodle.assets.loadTextures({
   *   "myImage": new URL("assets/image.png"),
   * });
   * const quad = toodle.Quad("myImage");
   *
   * toodle.startFrame();
   * toodle.draw(quad);
   * toodle.endFrame();
   */
  Quad(assetId: TextureId, options: QuadOptions = {}) {
    options.idealSize ??= this.assets.getSize(assetId);
    options.shader ??= this.#defaultQuadShader();
    options.atlasCoords ??= this.assets.extra.getAtlasCoords(assetId)[0];
    options.textureId ??= assetId;
    options.cropOffset ??= this.assets.extra.getTextureOffset(assetId);

    options.atlasSize = this.#atlasSize;
    options.region ??= {
      x: 0,
      y: 0,
      width: options.atlasCoords.uvScale.width * this.#atlasSize.width,
      height: options.atlasCoords.uvScale.height * this.#atlasSize.height,
    };

    const quad = new QuadNode(options, this.#matrixPool);
    return quad;
  }

  /**
   * Create a jumbo quad node. This contains multiple tiles for a single texture.
   *
   * @param assetId - The ID of the asset to use for the jumbo quad. This must have been loaded with toodle.assets.loadTextures.
   *
   * @param options - QuadOptions for Quad creation
   *
   */
  JumboQuad(assetId: TextureId, options: JumboQuadOptions) {
    options.shader ??= this.#defaultQuadShader();
    options.textureId ??= assetId;
    options.cropOffset ??= this.assets.extra.getTextureOffset(assetId);
    options.tiles ??= [];

    for (const tile of options.tiles) {
      if (!tile.size) {
        tile.size = this.assets.getSize(tile.textureId);
      }

      if (!tile.atlasCoords) {
        tile.atlasCoords = this.assets.extra.getAtlasCoords(tile.textureId)[0];
      }
    }

    let width = 0;
    let height = 0;
    for (const tile of options.tiles) {
      width += tile.size!.width;
      height += tile.size!.height;
    }

    options.region ??= {
      x: 0,
      y: 0,
      width,
      height,
    };

    options.atlasSize = this.#atlasSize;

    return new JumboQuadNode(options, this.#matrixPool);
  }

  /**
   * Create a new container node.
   *
   * @example
   *
   * const node = toodle.Node();
   * const child = node.add(toodle.Node());
   * node.position = [100, 100];
   * console.log(child.matrix);
   */
  Node(nodeOpts?: NodeOptions) {
    return new SceneNode(nodeOpts);
  }

  Text(fontId: string, text: string, textOpts?: TextOptions) {
    const shader = this.assets.getFont(fontId);

    return new TextNode(shader, text, textOpts);
  }

  shapes = {
    Rect: (options: QuadOptions = {}) => {
      options.idealSize ??= { width: 1, height: 1 };
      options.shader ??= this.#defaultQuadShader();
      options.atlasCoords ??= {
        atlasIndex: 1000,
        uvOffset: { x: 0, y: 0 },
        uvScale: { width: 0, height: 0 },
        cropOffset: { x: 0, y: 0 },
        originalSize: { width: 1, height: 1 },
      };

      const quad = new QuadNode(options, this.#matrixPool);

      if (options?.position) {
        quad.position = options.position;
      }

      if (options?.rotation) {
        quad.rotation = options.rotation;
      }

      if (options?.scale) {
        quad.scale = options.scale;
      }

      return quad;
    },

    Circle: (options: QuadOptions = {}) => {
      options.idealSize ??= { width: 1, height: 1 };
      options.shader ??= this.#defaultQuadShader();
      options.atlasCoords ??= {
        atlasIndex: 1001,
        uvOffset: { x: 0, y: 0 },
        uvScale: { width: 0, height: 0 },
        cropOffset: { x: 0, y: 0 },
        originalSize: { width: 1, height: 1 },
      };

      const quad = new QuadNode(options, this.#matrixPool);

      if (options?.position) {
        quad.position = options.position;
      }

      if (options?.rotation) {
        quad.rotation = options.rotation;
      }

      if (options?.scale) {
        quad.scale = options.scale;
      }

      return quad;
    },

    Line: (options: LineOptions) => {
      const center = {
        x: (options.start.x + options.end.x) / 2,
        y: (options.start.y + options.end.y) / 2,
      };
      const angle = Math.atan2(
        options.end.y - options.start.y,
        options.end.x - options.start.x,
      );
      const length = Math.sqrt(
        (options.end.x - options.start.x) ** 2 +
          (options.end.y - options.start.y) ** 2,
      );

      const line = new QuadNode(
        {
          color: options.color,
          atlasCoords: {
            atlasIndex: 1000,
            uvOffset: { x: 0, y: 0 },
            uvScale: { width: 0, height: 0 },
            cropOffset: { x: 0, y: 0 },
            originalSize: { width: 1, height: 1 },
          },
          shader: options.shader ?? this.#defaultQuadShader(),
          idealSize: { width: 1, height: 1 },
          layer: options.layer,
          key: options.key,
          rotationRadians: angle,
          scale: {
            x: length,
            y: options.thickness ?? 1,
          },
          position: center,
        },
        this.#matrixPool,
      );

      return line;
    },
  };

  #quadShader: QuadShader | null = null;

  #defaultQuadShader() {
    if (this.#quadShader) {
      return this.#quadShader;
    }

    const shader = this.QuadShader(
      "default quad shader",
      this.#limits.instanceCount,
      /*wgsl*/ `
        @fragment
        fn frag(vertex: VertexOutput) -> @location(0) vec4f {
          let color = default_fragment_shader(vertex, ${
            this.#defaultFilter === "nearest"
              ? "nearestSampler"
              : "linearSampler"
          });
          return color;
        }
      `,
    );

    this.#quadShader = shader;
    return shader;
  }

  /**
   * Attach toodle to a canvas.
   *
   * @param canvas - The canvas to attach toodle to.
   * @param options - ToodleOptions for the creation of the toodle instance
   * @returns A promise that resolves to a Toodle instance.
   *
   * @example
   *
   *   const canvas = document.createElement("canvas");
   *
   *   const toodle = await Toodle.attach(canvas);
   */
  static async attach(canvas: HTMLCanvasElement, options?: ToodleOptions) {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const { device, context, presentationFormat } = await initGpu(canvas);
    return new Toodle(
      device,
      context,
      presentationFormat,
      canvas,
      {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      },
      options || {},
    );
  }

  /**
   * Destroy the toodle instance and release its gpu and cpu resources.
   *
   * Note that calling any methods on the instance after this result in undefined behavior.
   */
  destroy() {
    this.#resizeObserver.disconnect();
    this.#device.destroy();
    this.assets.destroy();
  }

  /**
   * Advanced and niche features
   */
  extra = {
    /**
     * Get the GPU device used by this Toodle instance.
     */
    device: (): GPUDevice => {
      return this.#device;
    },
  };
}

export type StartFrameOptions = {
  /**
   * The load operation to use for the render pass.
   *
   * **clear**: clear the current texture to the clear color. necessary if you're using toodle without another renderer.
   *
   * **load**: blend the render pass with the current canvas contents. useful if you're using toodle alongside another renderer like painter or pixi.js
   *
   * @default "clear"
   *
   */
  loadOp?: "load" | "clear";
};

export type ToodleOptions = {
  /**
   * The filter mode to use for the default quad shader.
   * see: https://webgpufundamentals.org/webgpu/lessons/webgpu-textures.html#a-mag-filter
   *
   * **nearest**: nearest neighbor sampling. makes pixel art look sharp and vector art look jaggy.
   *
   * **linear**: linear sampling. makes vector art look smooth and pixel art look blurry.
   *
   * @default "linear"
   */
  filter?: "nearest" | "linear";
  limits?: LimitsOptions;
};

export type LineOptions = {
  /**
   * The start position of the line.
   */
  start: Point;
  /**
   * The end position of the line.
   */
  end: Point;
  /**
   * The color of the line.
   */
  color: Color;
  /**
   * The thickness of the line.
   */
  thickness?: number;
  /**
   * The shader to use for the line.
   */
  shader?: IShader;
  /**
   * The layer to draw the line on.
   */
  layer?: number;
  /**
   * A unique identifier for the line.
   */
  key?: string;
};
