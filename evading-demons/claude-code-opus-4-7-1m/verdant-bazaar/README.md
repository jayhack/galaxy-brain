# verdant-bazaar

Submission for the [`evading-demons`](../../README.md) galaxy-brain eval.

## Play it now

**➡ [`index.html`](./index.html)** (committed in the repo, browser-playable)

> Also mirrored for GitHub Pages at
> [jayhack.github.io/galaxy-brain/artifacts/evading-demons/claude-code-opus-4-7-1m.html](https://jayhack.github.io/galaxy-brain/artifacts/evading-demons/claude-code-opus-4-7-1m.html)
> via `docs/artifacts/`.

No build step. No install step. Open `index.html` directly in a modern browser
(Chrome, Firefox, Safari) and play.

If your browser blocks local ES module imports from a `file://` URL, serve the
directory with a one-line static server instead:

```bash
cd evading-demons/claude-code-opus-4-7-1m/verdant-bazaar
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Controls

- `ArrowUp` / `ArrowDown` — move forward / back
- `ArrowLeft` / `ArrowRight` — turn
- `Space` — jump (high enough to clear benches and kiosks)
- `Shift` — sprint (drains the stamina bar)
- `R` — restart after death (or any time)

## What shipped

- **Third-person character controller** with arrow-key navigation, jump, and
  a chase camera that rides behind the player's facing.
- **Solarpunk shopping mall** — a glass-roofed atrium with shop bays on both
  long sides (five colored storefronts each), solar-panel awnings, columns
  with climbing vines, a central tiered fountain, planters with live trees,
  wooden benches, lamp posts, hanging planter lanterns, and kiosks.
- **Obstacles that shape movement** — all columns, planters, kiosks, benches,
  the fountain, the end walls, and the back walls of each shop bay have AABB
  colliders. You weave around columns, slide along walls, and can jump over
  benches (55cm) and kiosks (1.3m).
- **Day-to-night transition into a space-like night** — the sky fades from
  solarpunk blue through dusk orange into deep black-violet. Thousands of
  stars fade in through the glass roof, a ringed purple planet rises, a
  nebula cloud glows on the horizon, and the mall's lamp posts, hanging
  lanterns, and shop storefronts wake up in warm light. Demon eyes burn
  brighter and their chase speed ramps up at night.
- **Demon AI that kills on contact** — demons spawn at the mall's far ends,
  pursue the player directly, wobble and float, and kill instantly on touch.
  Count and speed scale with elapsed time and with night intensity.
- **Clear lose state + in-game restart** — a death overlay reports time
  survived, sunmotes collected, and distance traveled. Click `Run Again` or
  press `R` to start a fresh run without reloading the page.
- **Sunmote collectibles** — optional scoring loop; gather glowing orbs
  that respawn as you collect them.
- **HUD** — score, distance, timer, demon count, phase label, in-game clock,
  stamina bar.

## Stack

- HTML
- CSS
- JavaScript (ES modules)
- Three.js 0.160 from CDN (via `importmap`)

Single self-contained `index.html` — no bundler, no package manager, no build.
