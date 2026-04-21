# fishtank-water-sim — claude-code-opus-4-7

## Open the demo (no install)

[Open `index.html`](./index.html) directly in Chrome, Firefox, or Safari (`File → Open`, or drag the file into the window).

The page loads **Three.js r170** and **OrbitControls** from **esm.sh** on first open, so you need a live network connection the first time you open it.

## What it does

Single self-contained HTML. Black scene, a transparent **glass cube** with glowing edge highlights so the tank reads clearly, a shallow-water **height-field** simulation clipped to the tank interior, a **visible pour stream** (core cylinder + additive point drops) falling from above the tank, a **fill phase** that raises the water level with an eased curve, and a **slosh phase** after the pour finishes where the surface keeps moving from the residual impulses.

- **Drag** to orbit, **scroll** to zoom (OrbitControls).
- **Move the mouse** across the tank — the cursor is raycast onto the water surface and drag-speed-scaled impulses push the wave equation around.
- **Reset pour** button replays the pour-and-slosh from an empty tank.

Mirrored for GitHub Pages at `docs/artifacts/fishtank-water-sim/claude-code-opus-4-7.html`.
