## 0.1

- ~~Z-index rendering~~
- ~~MSDF Text~~
- ~~Load and unload atlases by bundle id~~
- ~~Quad world space api~~
- Uniform buffer in custom shaders (e.g. color swap shaders)
- Custom shader API
- DX: step through draw calls
- ~~Docs~~
- ~~Publish package~~
- ~~Inter-op with sdk~~

---

## Texture Atlases

- Introspect loaded atlases
- Render KTX textures
- Render textures with padding
- Generate atlases
  - MaxRects bin packing
  - Trim transparent pixels
  - Rotate 90 degree spritesheets
- Configure mipmaps

## Debugging & Developer Experience

- Show pipeline changes (needs text rendering)
- Show loaded atlases and memory usage

## Custom Shaders

- Mask example
- Bind textures to custom shaders
- MSAA Option for custom shaders

## Post-processing

- API for post-processing shaders
- Bloom example
- Vignette example
- 2d lighting example
