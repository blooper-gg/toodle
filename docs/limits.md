# Limits

Toodle renders at 60fps and will always take up exactly 5gb of vram.<sup>1</sup>

It achieves this by setting hard limits which you should be aware of before using Toodle. These limits may make it unsuitable for your game!

## Node Limits

- Toodle can only render 2048 nodes per frame.<sup>2</sup>
- The maximum number of unique node layers (a.k.a. z-indexes) in a scene is 32.

## Texture Limits

- All of the textures in your game must fit into 64 4096x4096 textures.<sup>3</sup>
- The maximum texture size of any individual texture is 4096x4096.

## Text Limits

- The maximum number of unique fonts is 32.<sup>4</sup>
- The maximum number of unicode characters in a single text block is 256.
- Toodle does not yet support CJK characters or emoji.

## Shader Limits

- The maximum number of unique custom shaders is 32.
- The maximum number of custom shader struct fields is 8
- The maximum size of a uniform buffer is 64kb

## Modifying Limits

These limits can be modified when `Toodle.attach()` is called.

::: warning

Increasing default maximums may result in low frame rates or introduce unexpected behaviour.

:::

```ts
const toodle = await Toodle.attach(canvas, {
  limits: {
    // reduce memory usage by only using 10 texture atlases
    textureArrayLayers: 10
  }
})
```

<hr />
<small>
[1]: Vram usage can exceed this if you explicitly ask for data buffers for custom shaders.
<br />
[2]: Quads and text count towards the node limit, parents without a render component do not.
<br />
[3]: This would be 256 1024x1024 textures or 462,400 48x48 textures with perfect packing.
<br />
[4]: Font weights count as separate fonts.
</small>
