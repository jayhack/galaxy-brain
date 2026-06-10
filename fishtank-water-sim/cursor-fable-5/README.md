# fishtank-water-sim — cursor-fable-5

A single self-contained HTML file with a 3D fish-tank pour simulation:

- Black scene with a see-through glass cube tank (open top, edge-highlighted) on a faintly reflective floor.
- Water starts **above** the tank as a droplet stream from a spout, pours in, and the tank fills over ~6.5 s.
- The water is a real volume (displaced top surface + side walls that follow the wave heights at the glass), driven by a 96×96 damped shallow-water heightfield. When the pour ends, the tank gets a side-to-side slosh kick and keeps sloshing — a tiny ambient swell means it never goes perfectly still.
- **Mouse**: moving the pointer across the water raycasts onto the surface and carves a wake (strength scales with pointer speed).
- **Camera**: OrbitControls — drag to orbit, scroll to zoom.
- **Reset**: button in the top-left panel (or press `R`) replays the whole pour-and-slosh.

## Run it

Open [`index.html`](./index.html) directly in a desktop browser — no build, no server:

```bash
open fishtank-water-sim/cursor-fable-5/index.html
```

Three.js (r160) and OrbitControls load from the jsDelivr CDN via an import map, so an internet connection is required on first load.

## Best file for evaluation

`fishtank-water-sim/cursor-fable-5/index.html` — also mirrored at `docs/artifacts/fishtank-water-sim/cursor-fable-5.html` and served by the results site as `./artifacts/fishtank-water-sim/cursor-fable-5.html`.

## Implementation notes

- Wave dynamics: classic two-array height/velocity scheme (`v += (avg4 − h)·k`, damped, reflective boundaries) stepped at a fixed 60 Hz with per-step volume renormalization so splashes don't drain the tank.
- The pour is an instanced-mesh droplet stream (~120 drops/s) with gravity; each drop that reaches the surface injects a splash impulse at its impact cell, so the fill churns where the stream lands.
- Water and glass are `MeshPhysicalMaterial` lit by a PMREM room environment; the glass uses depth-write-off transparency so the water always reads as *inside* the cube.

No environment variables, no dependencies to install.
