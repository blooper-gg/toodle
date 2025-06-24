# Layers

In toodle, one draw call is made for the whole scene. Parents are drawn before children, siblings are drawn in the order they are added.

Layers help you group nodes into separate draw calls. Children inherit their parent's layer unless overriden.

If you're coming from web development, you can think of a `layer` as a `z-index`

{toodle=snippets/layer.ts width=400px height=400px}

<<< @/snippets/layer.ts
