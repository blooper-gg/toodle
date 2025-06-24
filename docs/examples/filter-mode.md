# Filter Mode

The first decision you'll make is whether to use linear or nearest neighbor filtering when scaling textures.

**Linear filtering** is recommended for **vector or photo-realistic art** because it will:

- blend between adjacent pixels to approximate the color, which adds new colors to the image
- make pixel art look blurry and vector or photo art look smoother

**Nearest neighbor filtering** is recommended for **pixel art** because it will:

- retain the exact color palette of the original image
- make pixel art look crisp and vector or photo art look jaggy

```ts
// this is the default if you don't explicitly specify a filter
const toodle = await Toodle.attach(canvas, {
  filter: "linear",
});
```

{toodle=snippets/filter-linear.ts width=400px height=400px}

```ts
const toodle = await Toodle.attach(canvas, {
  filter: "nearest",
});
```

{toodle=snippets/filter-nearest.ts width=400px height=400px}

More details on filtering can be found here: https://webgpufundamentals.org/webgpu/lessons/webgpu-textures.html#a-mag-filter
