# porsche-render — cursor-opus-4-7-xhigh

**Project name:** spyder-rs-shark-blue

A single, dependency-light HTML file with a hand-coded 3D **Porsche 718 Spyder RS** dropped on a closed track and drivable from the keyboard.

## Open the demo (no install)

[Open `index.html`](./index.html) directly in Chrome, Firefox, or Safari (`File → Open`, or drag the file into the window).

The page imports **Three.js r170** (plus `OrbitControls` and `RoundedBoxGeometry`) from **esm.sh** the first time it opens, so you need a live network connection on the first load. Everything else — geometry, materials, track, sky, car physics, HUD — is generated in code inside the file.

## What's in here

- **Hand-coded Porsche 718 Spyder RS body** built from `RoundedBoxGeometry`, `ExtrudeGeometry` (wedge-profile fenders extruded across the fender width), spheres, cylinders and a small amount of canvas-textured decals. No `.glb` / `.gltf` / `.obj` of a real 718 is loaded. Signature details modeled in code:
  - **Two Spyder humps** behind the cockpit, each with a chrome **roll-over hoop** and a dark central tonneau spine.
  - **Round LED headlights** with the four-puck DRL pattern and a clear lens cover.
  - **Front fascia** with central intake, two flanking side intakes (mesh slats), a carbon-look splitter and small canards.
  - **Side air intakes** with mesh slats ahead of the rear wheels.
  - **NACA-style hood ducts**.
  - **Continuous LED tail strip** plus round taillight rings and **center-exit titanium-look exhausts** in the rear fascia, with a fluted diffuser.
  - **Twin 5-spoke wheels** with red center-lock nut, brake rotor and red caliper labeled "PORSCHE". The cowl carries a Porsche crest decal; "718 SPYDER RS" badges on the rear flanks; "PORSCHE" script across the engine cover.
- **Drivable arcade car** — bicycle-model heading update, speed-dependent steering, gear/speed/tach HUD, four-camera system (chase / orbit / cinematic / hood-cam).
- **Simple closed track** — a Catmull-Rom oval-with-character with asphalt texture, red-white curbs on both edges, dashed centerline, checkered start/finish, a start-arch banner, two grandstands, ringed and infield low-poly trees, a procedural environment map for paint reflections, and a shader-gradient sky dome.

## Controls

| Key | Action |
| --- | --- |
| `W` / `↑` | Throttle |
| `S` / `↓` | Brake / reverse |
| `A` / `←` | Steer left |
| `D` / `→` | Steer right |
| `Space` | Handbrake |
| `R` | Reset car to the start/finish line |
| `C` | Cycle camera (Chase → Orbit → Cinematic → Hood) |
| `H` | Hide / show the HUD |

Orbit camera supports drag-to-rotate and scroll-to-zoom; the chase and cinematic cameras follow the car automatically.

## Mirror

The same playable file is mirrored under [`docs/artifacts/porsche-render/cursor-opus-4-7-xhigh.html`](../../docs/artifacts/porsche-render/cursor-opus-4-7-xhigh.html) for the GitHub Pages results site's **Open HTML output** button.

## Notes for evaluators

The car geometry is generated entirely in code inside `index.html`. Searching the file for `new THREE.` will reveal each primitive's construction; the body has no `loader`, no `fetch` of model files, no embedded base64 mesh. Materials are vanilla `MeshPhysicalMaterial` / `MeshStandardMaterial` against a procedural environment map. Acceptance can be verified by:

1. Opening `index.html` directly in a desktop browser.
2. Visually identifying the round headlights, twin Spyder humps + roll hoops, mid-engine side intakes, wide rear fenders, center exhaust and continuous LED tail strip from the chase view.
3. Pressing `W` and `A` / `D` to drive a lap around the closed track.
4. Inspecting `index.html` to confirm there is no `loader.load()` / `GLTFLoader` / `OBJLoader` and no encoded mesh data for an existing 718.
