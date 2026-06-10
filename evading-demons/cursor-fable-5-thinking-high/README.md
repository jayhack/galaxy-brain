# sunspire-galleria

Solution for `evading-demons`.

**Play it now: open [`index.html`](./index.html) directly in a desktop browser.**
It is fully self-contained (Three.js r147 is inlined), so it works from
`file://` with no network, no install, and no build step.

## Harness / model

- Harness: `cursor`
- Model: `fable-5-thinking-high`

## What I built

**Sunspire Galleria** — a third-person survival game set in a solarpunk
shopping mall. By day the atrium hums: glass roof, living-wall columns,
potted trees, a fountain, kiosks, benches, and storefronts
(FERN & FILAMENT, SOLSTICE BREW, MOSSWARE...). Roughly every minute the sky
tears into a space-like night — stars, nebulae, and a ringed planet appear
over the atrium, the lamps and shop signs flicker on — and **demons pour out
of violet rifts** at the mall's edges. One touch kills you instantly.
Survive the night and the dawn burns them away; each night that follows is
faster and more crowded.

Design choices worth noting:

- **Obstacles matter twice.** Tall structure (kiosks, trees, columns, the
  fountain) blocks both you and the demons — bait pursuers around them. Low
  furniture (planters, benches) blocks *you* unless you jump it, while demons
  drift over it like smoke, so hopping greenery is how you cut corners.
- **Jump is an escape tool.** A well-timed jump clears a lunging demon
  (apex ~1.7 m vs. their 1.3 m reach), and you can stand on planters —
  but they will float right up to you, so it's a delay, not a safehouse.
- **Spawns are never cheap.** Demons emerge only from the rifts farthest
  from you, scale in over half a second, and steer with per-demon wobble and
  mutual separation so they flank instead of forming a conga line.
- **Readable lose loop.** Death flashes red, shows time survived and nights
  endured, and restarts in place with `R` or the button — no reload needed.

## How to run or open

1. Clone the repo.
2. Open `evading-demons/cursor-fable-5-thinking-high/index.html` in Chrome,
   Firefox, Safari, or Edge on a desktop. That's it.

Controls: **Arrow keys** (or WASD) to run, **Space** to jump, **R** to
restart after death.

Debug/eval query params: `?t=0.62` starts at night, `?demons=5` pre-spawns
demons (e.g. `index.html?t=0.62&demons=5` to see the chase immediately).

## Artifact

The mirrored Vercel artifact path is:

`public/artifacts/evading-demons/cursor-fable-5-thinking-high.html`

## Source layout / rebuilding

`index.html` is the committed, playable artifact. It is assembled from
`src/template.html` (shell + UI/CSS), `src/game.js` (all game code), and an
inlined copy of Three.js r147 by running:

```bash
node build.mjs   # fetches three.min.js into vendor/ on first run
```

You only need this if you edit `src/`; evaluators can ignore it.

## Notes

- No external dependencies or environment variables; no audio, combat, or
  mobile controls (per the eval's out-of-scope list).
- Verified headlessly in Chrome (software WebGL): movement, jumping,
  the dusk transition, demon pursuit, contact death, and `R` restart.
