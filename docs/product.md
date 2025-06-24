# Product Specification: 2D Rendering Engine "Toodle"

## Overview

This 2D browser rendering engine is a lightweight, medium-performance solution tailored for creating 2D indie games with graphical fidelity on par with titles like **Celeste**, **Stardew Valley**, and **Slay the Spire**.

It provides a simple immediate-mode API for rendering textured quads and MSDF text, with hierarchical scene management and extensibility through custom wgsl shaders.

It uses WebGPU for rendering and batching to achieve performance goals, with a WebGL fallback.

## Core Features

### 1. Rendering capabilities

#### 1.1 Primary interface

Developers interact with the renderer through an immediate-mode API, trading off some top-end performance for flexibility and expressiveness.

Rendering uses textured quads as the core primitive.

```ts
const quad = new Quad("image.png");

toodle.startFrame();
toodle.draw(quad);
toodle.endFrame();
```

#### 1.2 Hierarchical rendering

Textured quads and text blocks maintain a transform matrix and a parent reference. World space is calculated using the parent-relative transform.

```ts
const parent = new Quad("parent.png");
const child = new Quad("child.png");
parent.add(child);

// draws the parent and the child
toodle.draw(parent);
```

#### 1.3 Batched rendering

Default rendering with no z-indexes specified and no custom shaders using a single draw call to draw all textured quads.

Additional draw calls occur for:

- Each unique z-index
- Each custom shader pipeline

Hard limit of **2048** quads drawn per frame.

### 2. Texture Management

#### 2.1 Texture loading

Game textures can be loaded from:

- A list of urls
- A zip file containing the assets
- A pre-baked texture atlas and a JSON manifest

Textures are packed into **4k texture atlases** with a maximum of **64** atlases in the webgpu texture array.

#### 2.2 Texture atlas creation

The texture atlas creator will take a list of images and create a single texture atlas that is optimized for the GPU.

#### 2.3 Asset bundles

The gamedev will be able to specify a bundle id for groups of textures to be loaded together. Gamedevs can then load and unload texture atlases by bundle id

### 2.4 Texture compression

The renderer must be able to load ktx2 textures along with uncompressed rgba8 textures.

## 3. Custom Shaders

Developers can write custom shaders using snippets of wgsl. These snippets are inserted into a base shader.

Shaders can be written and loaded at runtime for quick iteration during development. Quads can have shaders attached and removed at runtime.

### 3.1 Quad shader pipelines

Developers can define custom shader pipelines at runtime using snippets of wgsl. They can then assign shaders to quads, for e.g.

```ts
const colorFlash = new Shader("colorFlash", {
  instance: `
    struct Flash {
      color: vec4f,
      intensity: f32
    }
  `,
  fragment: `
  let flashColor = mix(color.rgb, flash.color.rgb, flash.intensity);
  return vec4f(flashColor, color.a);
`,
});

const quad = new Quad("image.png", {
  shader: colorFlash,
});
```

Snippets give developers the ability to:

- Define vertex instance structs with up to 8 parameters
- Define uniform structs
- Modify vertex shader inputs and outputs
- Modify fragment shader inputs and outputs

Shader pipelines have some hard limits:

- 32 unique shader pipelines
- 8 instance struct fields per shader
- 64kb uniform buffer size per shader

### 3.2 Post-processing

Developers can run post-processing shaders on the final rendered image of a given frame. This would support effects like:

- Color grading
- Vignette
- Bloom
- 2d lighting

### 3.3 Camera

There is a single camera that is used for all shader rendering. It has a position, a zoom level, and a rotation. These are combined into a 3x3 matrix which is passed to the shaders.

Quads can optionally opt out of the camera transform for screen-space UI.

## 4. Text Rendering

Text blocks are rendered using Multi-Channel Signed Distance Fields (MSDF) to achieve sharp text rendering at a reasonable cost.

Gamedevs have the ability to:

- Define vertical and horizontal text alignment
- Define the text block's width and height
- Fit text size to a width/height
- Use custom fonts (MSDF generation is out of scope, they would need to generate the MSDF textures themselves)

## 5. Serialization

It is critical that scene state (e.g. quad trees from a given quad root) are deterministically serializable to a JSON or binary format, and deserializable back to the same scene state.

## 6. Debugging Tools

Because setting up RenderDoc or other GPU debugging tools with webgpu is cumbersome, we'll need to provide some built-in tools for inspecting the renderer's state.

### 6.1 Frame and Draw Call Analysis

- Step through each batch of draw calls in a single frame.
- Visualize batching behavior for z-indexes and custom shaders.

### 6.2 Texture Atlas Explorer

- For any frame, visualize all texture atlases that are loaded into memory.
- See the memory footprint of each atlas.

### 6.3 Performance Metrics

- Optional overlay with FPS and GPU memory graph.

## Out of Scope

This rendering engine is designed to focus exclusively on 2D rendering. The following features are explicitly out of scope:

- 3D rendering
- Input handling, audio, simulation logic, etc.
- 2D physics
- Editor frontend
