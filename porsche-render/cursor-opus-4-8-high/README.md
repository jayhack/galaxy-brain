# Porsche 718 Spyder RS — `cursor-opus-4-8-high`

A single, self-contained HTML file: a **hand-coded 3D Porsche 718 Spyder RS** you can
drive around a closed track in the browser. No build step, no external 3D assets.

## Run it

Just open the file in a desktop browser:

```
porsche-render/cursor-opus-4-8-high/index.html
```

Double-click it, or drag it into Chrome / Edge / Firefox / Safari. Three.js is pulled
from a CDN via an `importmap`, so the only requirement is an internet connection the
first time you open it. There is nothing to install or compile.

## Controls

| Key | Action |
|---|---|
| `W` / `↑` | Throttle |
| `S` / `↓` | Brake → reverse |
| `A` `D` / `←` `→` | Steer |
| `Space` | Handbrake |
| `C` | Toggle camera (chase ⇄ free orbit) |
| `P` | Cycle paint colour (GT Silver, Guards Red, Shark Blue, Racing Yellow, Gentian Blue, Carrara White) |
| `R` | Reset car to the start/finish line |

### Optional URL parameters (showcase / deep-linking)

These are conveniences for screenshots and previews — the playable experience needs none of them.

- `?hero=1` — start on a slow turntable around the parked car (auto-switches to the chase cam the moment you drive).
- `?cam=side` / `?cam=front` / `?cam=rear34` — static framed beauty shots.
- `?paint=2` — start in a specific paint (index `0`–`5`, same order as the `P` key).
- `?solo=1` — hide the track/scenery and show just the car on a neutral backdrop (handy for inspecting the geometry).

## What's modelled (all generated in code)

The body is **not** a downloaded `.glb`/`.gltf`/`.obj`. The main surface is a custom
**lofted mesh**: ~15 hand-authored cross-sections (`section({...})`) are swept front-to-rear,
catmull-rom smoothed, mirrored, capped and `computeVertexNormals()`'d into one
`BufferGeometry`. The cockpit "opens" because the cross-sections in the cabin region
dip their top profile into the tub instead of closing over.

Measured bounding box ≈ **4.47 m × 2.14 m × 1.26 m** — within a few cm of the real car
(4.41 × 2.00 × 1.19), so the low-slung roadster stance reads on sight.

Signature 718 Spyder RS cues, each built from primitives:

- Low, wide roadster body with pronounced front & rear haunches (the loft).
- Oval headlights with the **four-point LED DRL** signature + emissive projectors.
- Three-section front intakes, carbon splitter, and a low nose.
- **Twin streamliner humps** behind the seats (the Spyder RS calling card) with NACA-style intake slots.
- Vertical **side air intakes** ahead of the rear wheels (mid-engine breathers) with fins.
- Full-width rear **light bar** + segmented tail lights + `PORSCHE` script.
- Rear ducktail lip, carbon diffuser with fins, and a **central twin titanium exhaust**.
- Sculpted sport-bucket interior: dashboard, centre tunnel, low headrests, three-spoke steering wheel, raked windscreen.
- Multi-spoke **centre-lock** wheels, low-profile tyres, brake discs and **red calipers**; fronts steer, all four spin with speed.
- `718` side script and a `PORSCHE` hood crest via canvas-texture decals.

Materials use `MeshPhysicalMaterial` car paint with **clearcoat** lit by a neutral
`RoomEnvironment` PMREM, so the bodywork picks up realistic studio reflections.

## The scene & driving

- A closed, gently curved loop track (asphalt ribbon built from a `CatmullRomCurve3`)
  with dashed centre line, red/white curbs, a checkered start/finish, grass, trees and a gradient sky.
- Arcade driving: throttle/brake/reverse, speed-sensitive steering, handbrake, rolling
  drag, plus subtle body roll & pitch for feel. The world is a flat ground plane, so the
  car never falls through it.
- A smoothing **chase camera** follows the car; press `C` for a free orbit camera.
- A small HUD shows speed (km/h) and a faux gear readout.

## Tech

`HTML` · `CSS` · `JavaScript (ES modules)` · `Three.js r160` (CDN) · `WebGL`. One file, ~880 lines.
