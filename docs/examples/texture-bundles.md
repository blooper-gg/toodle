# Texture Bundles

Loading textures can be surprisingly expensive. A 1024x1024 png may only be 100kb on disk, but when loaded into the gpu, each pixel is 4 bytes of rgba data, so that's 4mb of memory.

Bundles are a way to choose what is loaded into the gpu, to avoid hitting the VRAM memory limit (we recommend 4gb to cover lower-end devices).

{toodle=snippets/texture-bundles.ts width=400px height=400px}

<<< @/snippets/texture-bundles.ts

## Duplicate Textures

Textures can be loaded into more than one bundle. You could have a character portrait on the main menu and character select screen,
and both could be loaded into separate bundles at the same time.

{toodle=snippets/repeat-texture-loading.ts width=400px height=400px}

<<< @/snippets/repeat-texture-loading.ts
