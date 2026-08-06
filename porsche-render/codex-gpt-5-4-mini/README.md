# codex-gpt-5-4-mini

Single-file Three.js submission for the [`porsche-render`](../README.md) eval.

Open [`index.html`](./index.html) directly in a desktop browser. CDN imports are used for Three.js, but there is no build step and no downloaded car model.

Controls:

- `W` / `ArrowUp`: accelerate
- `S` / `ArrowDown`: brake / reverse
- `A` / `D` or arrow keys: steer
- `Space`: handbrake
- `R`: reset to the start line
- `C`: toggle chase / inspection camera

The Porsche 718 Spyder RS is generated in code from lofted body meshes, primitive geometry, procedural carbon/glass/paint materials, and generated decals. The file does not load `.glb`, `.gltf`, `.obj`, CAD, or image assets.

Required environment variables: none.

Best evaluation target: [`index.html`](./index.html). The mirrored copy is [`public/artifacts/porsche-render/codex-gpt-5-4-mini.html`](../../public/artifacts/porsche-render/codex-gpt-5-4-mini.html) for the results site.
