# heliomall-escape

Submission for the [`evading-demons`](../../README.md) galaxy-brain eval.

## Play it now

**➡ [`index.html`](./index.html)** (committed in the repo, browser-playable)

> Also mirrored for GitHub Pages at
> [jayhack.github.io/galaxy-brain/artifacts/evading-demons/codex-gpt-5.html](https://jayhack.github.io/galaxy-brain/artifacts/evading-demons/codex-gpt-5.html)
> via `docs/artifacts/`.

No build step. No install step. Open `index.html` directly in a browser and
play.

If your browser is strict about loading local module scripts, serve the
directory with a one-line static server instead:

```bash
cd evading-demons/codex-gpt-5/heliomall-escape
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Controls

- `ArrowUp` / `ArrowDown`: move forward and backward
- `ArrowLeft` / `ArrowRight`: turn
- `Space`: jump
- `R`: restart after death

## What shipped

- Third-person controller with jump and chase camera
- Solarpunk mall scene with shops, greenery, solar canopies, kiosks, benches,
  lamps, and collision
- Dynamic day-to-night shift into a darker, space-like environment
- Demon enemies that spawn, chase, and kill on contact
- Survival timer, demon count, death overlay, and restart loop

## Stack

- HTML
- CSS
- JavaScript
- Three.js from CDN
