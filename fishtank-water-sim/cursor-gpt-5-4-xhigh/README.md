# fishtank-water-sim — cursor-gpt-5-4-xhigh

## Open the demo (no install)

[Open `index.html`](./index.html) directly in Chrome, Firefox, or Safari (`File → Open` or drag the file into the window).

The page loads **Three.js r170** and **OrbitControls** from **esm.sh** (rewrites addon imports so the browser never hits bare `three` module specifiers); a network connection is required the first time so the CDN modules resolve.

## What it does

Single self-contained HTML: black backdrop, **transparent glass cube** with edge highlights, **water as a shallow-water heightfield** clipped to the tank interior, a **visible pour stream** from above the tank, **sloshing** after the fill phase, **mouse movement** that adds impulses when the cursor projects onto the water surface, **OrbitControls** (drag to orbit, scroll to zoom), and **Reset** to replay the pour.

Mirrored for GitHub Pages: `docs/artifacts/fishtank-water-sim/cursor-gpt-5-4-xhigh.html`.
