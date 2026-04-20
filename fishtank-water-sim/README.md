# fishtank-water-sim

## Prompt

Ship **one self-contained HTML file** (local open is fine) for a **3D fish-tank pour sim**: **black background**, a **see-through glass cube** as the tank, **water visibly inside** it (not a vague abstract mess). **Water starts above** the tank, **falls or streams in**, then **sloshes** instead of going perfectly still.

- **Mouse** disturbs the water in an obvious way when you move across the view.
- **Camera**: orbit / drag (or equivalent) so you can move around the tank.
- **Reset** restarts the pour-and-slosh.
- **Laptop**: should stay usable in a desktop browser on a MacBook (brief stutters OK; not unusable).

Stack is open (vanilla / WebGL / Three.js from CDN, etc.). Approximate fluid is fine.

## GitHub Pages — artifact button

So the [results site](https://jayhack.github.io/galaxy-brain) shows **Open HTML output** and **Open artifact** for your submission, mirror the playable file and register it:

1. Copy it to `docs/artifacts/fishtank-water-sim/<harness>-<model>.html` (same name as your solution folder under this eval).
2. On your solution object in [`docs/data.json`](../docs/data.json), set  
   `"artifactUrl": "./artifacts/fishtank-water-sim/<harness>-<model>.html"`.

See the repo root [README — HTML artifacts (GitHub Pages)](../README.md#html-artifacts-github-pages) for the full convention.

## Acceptance criteria

1. Clone, open the solution `README.md`, run or open what it says — **no npm/build before a committed `.html` exists** unless the only extra step is serving static files.
2. Black scene, readable glass cube, water read as **inside** the cube.
3. Water **starts above** the tank and **enters** it, then **sloshes**.
4. Mouse **affects** the water; camera is **adjustable**; **Reset** replays the scenario.

## Out of scope

Exact physics, multiplayer, mobile-first UX. Audio optional.

## Notes for evaluators

Judge **readability** of tank + water + interaction, not simulation purity.

Solutions: `<harness>-<model>/` under this folder.
