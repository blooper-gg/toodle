# Layout - Edges

Every toodle node has a `bounds` property that describes the bounding box of the node in world space.

You can use this alongside the positional setters to position nodes relative to each other.

{toodle=snippets/layout-edges.ts width=400px height=400px}

<<< @/snippets/layout-edges.ts

::: warning

This will not work as expected:

```ts
const container = toodle.Node({scale: 2})
const banana = container.add(
  // notice we are calling setBounds before adding to the parent
  toodle.Quad("banana").setBounds({
    left: 0,
    top: 0,
  })
);
```

The reason for this is that the `left` and `top` setters are applied in the toodle.Quad constructor, before the parent is set. Instead you will need to do this:

```ts
// here we call setBounds _after_ adding to the parent
const banana = container.add(toodle.Quad("banana")).setBounds({
  left: 0,
  top: 0,
})
```

When using `node.add` with a newly constructed node and adding it to a parent in the same line, you will get unexpected results.
:::
