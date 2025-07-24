# Changelog

A detailed list of all notable changes for every released version.

[All releases](https://www.npmjs.com/package/@blooper.gg/toodle)

## [0.0.91](https://github.com/blooper-gg/toodle/releases/tag/0.0.91)

- Fix `toodle.JumboQuad` tile positioning bug when `idealSize` is provided

## [0.0.90](https://github.com/blooper-gg/toodle/releases/tag/0.0.90)

- Fix `idealSize` option on `toodle.JumboQuad`

## [0.0.89](https://github.com/blooper-gg/toodle/releases/tag/0.0.89)

- Add `JumboQuadNode` to render a jumbo texture, see [jumbo texture example](https://toodle.gg/examples/jumbo-textures.html) for more details.

## [0.0.88](https://github.com/blooper-gg/toodle/releases/tag/0.0.88)

- Error handling: Throw `ToodleInstanceCap` error when too many instances are enqueued for a shader instead of returning an offset out of bounds error.

## [0.0.87](https://github.com/blooper-gg/toodle/releases/tag/0.0.87)

- Fix: Bundles loaded via pixi prebaked atlases now have the `cropOffset` calculated correctly

## [0.0.85 and 0.0.86](https://github.com/blooper-gg/toodle/releases/tag/0.0.86)

(administrative, no changes)

## [0.0.84](https://github.com/blooper-gg/toodle/releases/tag/0.0.84)

- Add `QuadNode.region` to allow rendering a subregion of a texture (useful for spritesheets / tilemaps), see [texel region example](https://toodle.gg/examples/sprite-region.html) for more details.
- **Breaking**: rename `QuadNode.drawOffset` to `QuadNode.cropOffset` to avoid confusion with region offset for spritesheets
- Add `QuadNode.extra.atlasSize` to get the size of the texture atlas in texels (usually 4096x4096). These dimensions are more commonly available in the `toodle.limits` object.

## [0.0.83](https://github.com/blooper-gg/toodle/releases/tag/0.0.83)

- Allow registering bundles with pre-baked texture atlases, see [pre-baking atlases](https://toodle.gg/examples/texture-bundles-prebaked.html) for more details.
- Add `toodle.assets.textureIds` to get an array of ids of all currently loaded textures.

## [0.0.82](https://github.com/blooper-gg/toodle/releases/tag/0.0.82)

- Add `toodle.extra.device` to get the GPU device used by the toodle instance.

## [0.0.80](https://github.com/blooper-gg/toodle/releases/tag/0.0.80)

- Fork public domain project to blooper-gg organization

## [0.0.72](https://github.com/blooper-gg/toodle/releases/tag/0.0.72)

- Add an optional `index` parameter to `node.add` to specify where to insert the new child for full control over the draw order when not using layers.
- Add `node.children` alias for `node.kids` - ai seems to really want the api to be called `children`.
- Add `QuadNode.isCircle` to check if a quad is rendering a circle.

## [0.0.71](https://github.com/blooper-gg/toodle/releases/tag/0.0.71)

TextNodes are now easier to serialize/deserialize.

- Add `TextNode.font` to get the font used by a `TextNode`.
- Add `font.id` to get the id of the font from the `AssetManager` perspective.
- Fix issue in fallback character logic and squash incorrect warning about missing fallback character.

## [0.0.70](https://github.com/blooper-gg/toodle/releases/tag/0.0.70)

- Add `Text.TextNode` and `Text.TextShader` to the toodle exports for use in automated testing outside the browser, eg `vitest` or `bun:test`. In a browser context `toodle.Text` will still be the best way to create text nodes.

## [0.0.69](https://github.com/blooper-gg/toodle/releases/tag/0.0.69)

Transparent cropping is in! Disabled by default, but can be enabled by passing `cropTransparentPixels: true` to `AssetManager.registerBundle`.

See the [transparent cropping example](https://toodle.gg/examples/transparent-cropping.html) for more details.

- Add `cropTransparentPixels` option to `AssetManager.registerBundle` to strip transparent pixels from textures.
- Add `autoLoad` option to `AssetManager.registerBundle` to automatically load a bundle when it is registered.
- Add `drawOffset` option to `toodle.Quad` to offset the draw position of the quad's texture.
- Add `quad.atlasCoords.uvScaleCropped` to get the cropped uv scale of the quad's texture.
- Add `quad.extra.cropRatio()` to get the ratio of a cropped quad's opaque texels to its original size.

## [0.0.67](https://github.com/blooper-gg/toodle/releases/tag/0.0.67)

- [Fix `maxTextLength` option in `Toodle.attach`] - this is now correctly applied to the `toodle.Text` constructor.

## [0.0.66](https://github.com/blooper-gg/toodle/releases/tag/0.0.66)

**Breaking change**

`rotation` in `NodeOptions` is now in degrees

```ts
// before - constructor for Quad and shapes interpreted rotation as radians
const node = toodle.shapes.Rect({ rotation: Math.PI / 2});
// but the `rotation` property was interpreted as degrees
node.rotation = 90;

// after - both consistently interpret `rotation` as degrees and `rotationRadians` as radians
toodle.shapes.Rect({ rotation: 90})
toodle.shapes.Rect({ rotationRadians: Math.PI / 2})
```

## [0.0.65](https://github.com/blooper-gg/toodle/releases/tag/0.0.65)

- Default `TextNode.idealSize` to the size of the text if no `idealSize` is provided.
- Accept `key` parameter in `toodle.shapes.Line` constructor. This allows associating a string key with the node for debugging purposes, and may be [used for optimizations in the future](https://github.com/blooper-gg/toodle/issues/82).

## [0.0.64](https://github.com/blooper-gg/toodle/releases/tag/0.0.64)

Allow [removal of nodes](https://toodle.gg/examples/add-and-remove-children.html)

- Added `node.delete()` to remove a node from a parent and all of it's children.
- Added `node.remove(node)` to remove a node from a parent without deleting it.