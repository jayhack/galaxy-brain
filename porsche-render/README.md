# porsche-render

## Prompt

Ship **one self-contained HTML file** that contains the **highest-fidelity 3D model of the Porsche 718 Spyder RS** you can build, dropped into a small drivable scene.

- The car must be **modeled by you** in code (geometry, materials, lights, etc.). **Downloading a pre-made CAD / GLTF / OBJ of the 718 Spyder RS is not allowed.** Generic helper primitives (boxes, cylinders, splines, extrusions, SDF tricks, procedural textures) are fine — the *Porsche-ness* must come from your work, not a ripped asset.
- Render it in the browser. Three.js / Babylon.js / raw WebGL / WebGPU / shaders — pick your weapon.
- Put it on a **simple closed track** (loop, oval, figure-eight — your call) with a ground plane and a sky. Nothing fancy.
- **Keyboard drive** it: arrow keys or WASD for accelerate / brake / steer. Physics can be totally arcade — it just has to feel like driving, not sliding.
- A **chase camera** that follows the car is enough; an optional orbit / free-cam toggle is a plus.

Stack is open as long as the deliverable is a single HTML the evaluator can open and view directly (CDN imports OK).

## Acceptance criteria

A fresh evaluator should be able to:

1. Clone the repo, open the committed `.html` in a desktop browser — no build step before a playable file exists.
2. Immediately see a recognizable **Porsche 718 Spyder RS** sitting on a track. Proportions, silhouette, signature details (low slung roadster body, fender shape, headlights, side intakes, rear deck, wheels) should read on sight.
3. Drive the car around the track with the keyboard and not fall through the world.
4. Confirm from the source that the car geometry is generated in code, not loaded from an external `.glb` / `.gltf` / `.obj` of an existing 718.

## Out of scope

Real vehicle physics, AI traffic, lap timing, multiplayer, mobile controls, audio. A pretty static car you can also drive beats a great driving sim with an ugly car.

## GitHub Pages — artifact button

So the [results site](https://jayhack.github.io/galaxy-brain) shows **Open HTML output** for your submission, mirror the playable file and register it:

1. Copy it to `docs/artifacts/porsche-render/<harness>-<model>.html` (same name as your solution folder under this eval).
2. On your solution object in [`docs/data.json`](../docs/data.json), set
   `"artifactUrl": "./artifacts/porsche-render/<harness>-<model>.html"`.

See the repo root [README — HTML artifacts (GitHub Pages)](../README.md#html-artifacts-github-pages) for the full convention.

## Notes for evaluators

Judge the **car** first (fidelity, silhouette, proportions, surfacing, materials) and the **driving** second (does it move plausibly around the loop). The track is a stage, not the show.

Solutions: `<harness>-<model>/` under this folder.
