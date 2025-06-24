---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Toodle"
  text: "WebGPU 2D Renderer"
  tagline: Talking to the GPU so you don't have to since 2024
  actions:
    - theme: brand
      text: Quickstart
      link: /quickstart

features:
  - title: Memory Stable
    icon: 💾
    details: Predictable memory usage, no unexpected runtime allocation
  - title: Batch Rendering
    icon: 🐙
    details: One draw call for each unique pipeline and z-index
  - title: Atlas Textures
    icon: 🌐
    details: All textures are stored in a single texture atlas array
  - title: Custom Shaders
    icon: 🎨
    details: Create 2d effects without having to write WGSL boilerplate
  - title: MSDF Text Rendering
    icon: 📝
    details: Draw text at any size from a small atlas texture
  - title: Stateless Rendering
    icon: 🫥
    details: Use your simulation state as the source of truth
  - title: Layout
    icon: 📐
    details: Simple primitives to lay out nodes relative to each other
---