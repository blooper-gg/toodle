# Layout - Screen and World Space

Inevitably there will come a time where you need to convert between screen and world space.

The browser api for mouse events returns screen coordinates, and you'll likely want to know if the mouse is over a node at some point.

This example uses `toodle.convertSpace` to determine whether the mouse is over a node.

{toodle=snippets/layout-screen-and-world-space.ts width=400px height=400px}

<<< @/snippets/layout-screen-and-world-space.ts
