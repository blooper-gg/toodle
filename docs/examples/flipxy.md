# FlipX and FlipY

You can mirror a `Quad` across the X or Y axis by setting `scale.x` or `scale.y` to a negative value. However, this will also affect children.

`quad.flipX` and `quad.flipY` can be used to independently flip the `Quad` without affecting its children.

Scale:

- Affects the scale of children
- Defaults to 1, 1

FlipX / FlipY:

- Affects only the quad that the values are set for
- Defaults to `false`, `false`.

{toodle=snippets/flipxy.ts width=200px height=200px}

<<< @/snippets/flipxy.ts
