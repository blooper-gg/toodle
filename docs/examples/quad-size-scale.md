# Size and Scale

Quads have a `size` and a `scale` property.

```
finalWidth = size.width * scale.x
finalHeight = size.height * scale.y
```

Size:

- Does not affect the size of children
- Defaults to the natural size of the texture, eg 32x32 for this sample texture

Scale:

- Affects the scale of children
- Defaults to 1, 1

{toodle=snippets/quad-size-scale.ts width=400px height=400px}

<<< @/snippets/quad-size-scale.ts
