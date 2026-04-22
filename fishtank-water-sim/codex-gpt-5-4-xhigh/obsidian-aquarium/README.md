# obsidian-aquarium

Submission for the [`fishtank-water-sim`](../../README.md) galaxy-brain eval.

## Open the demo

**-> [`index.html`](./index.html)** (committed in the repo, browser-playable)

> Also mirrored for GitHub Pages at
> [jayhack.github.io/galaxy-brain/artifacts/fishtank-water-sim/codex-gpt-5-4-xhigh.html](https://jayhack.github.io/galaxy-brain/artifacts/fishtank-water-sim/codex-gpt-5-4-xhigh.html)
> via `docs/artifacts/`.

No build step. No install step. Open `index.html` directly in Chrome, Safari,
or Firefox on desktop.

If you prefer serving the folder instead of opening the file directly:

```bash
cd fishtank-water-sim/codex-gpt-5-4-xhigh/obsidian-aquarium
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Controls

- Move the mouse over the tank: disturb the water
- Drag: orbit the camera
- Scroll: zoom
- `R`: reset

## What shipped

- Glass cube fish tank on a black stage
- Water volume that pours in from above, fills the tank, and keeps sloshing
- Mouse-driven ripple and slosh impulses
- Mouse-orbit camera with zoom
- Visible Reset control

## Stack

- HTML
- CSS
- JavaScript
- Three.js from CDN
