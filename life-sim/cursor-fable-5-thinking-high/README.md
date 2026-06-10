# cursor-fable-5-thinking-high — Isla Genesis

Solution for `life-sim`: a browser-viewable 3D island ecology where three
species compete, reproduce, mutate, and visibly evolve.

## ▶ Open it

**Playable artifact: [`index.html`](./index.html)** — open it directly in any
desktop browser (double-click works; Three.js is loaded from a CDN, so you need
an internet connection but no build step, backend, or API keys).

If your browser blocks anything on `file://`, serve the folder instead:

```bash
cd life-sim/cursor-fable-5-thinking-high
python3 -m http.server 8000
# open http://localhost:8000/
```

A mirrored copy is published at
[galaxybrain.dev/artifacts/life-sim/cursor-fable-5-thinking-high.html](https://galaxybrain.dev/artifacts/life-sim/cursor-fable-5-thinking-high.html).

## Harness / model

- Harness: `cursor`
- Model: `fable-5-thinking-high`

## What I built

**Isla Genesis** — a single-file Three.js artificial-life simulation:

- **Seeded island generation**: fractal-noise terrain with radial falloff,
  beaches, water, moisture-driven plant distribution, rocks and palms. The seed
  in the toolbar reproduces the entire run setup; 🎲 rolls a new island.
  Starting populations and per-island species trait baselines are also
  seed-jittered, so initial circumstances genuinely differ between runs.
- **Three ecological roles** with real mechanics:
  - *Glimmers* (grazers) eat plants that only regrow in daylight.
  - *Stalkers* (predators) ambush-hunt with a stamina-limited sprint, digest
    cooldowns, and pounce probabilities that depend on size, camouflage and
    whether the prey is asleep. Kill leftovers become carrion.
  - *Skitters* (amphibious scavengers) smell carrion at long range, eat tide
    wash-ups on the shoreline, can flee into shallow water where predators
    can't follow, and nibble plants inefficiently when starving.
- **Heritable 7-gene genome** (size, speed, sense, camo, nocturnal, fertility,
  hue) with per-gene crossover and gaussian mutation (8% chance of large
  jumps, flagged as ⚡ mutants in the event log). Genes are visible on the
  body: size scales the animal, speed elongates it, sense grows the head,
  camo/hue/nocturnal recolor it.
- **Behavior**: a utility state machine — flee > sleep > mate > eat > wander —
  driven by sensed neighbors via a spatial hash grid. The day/night cycle
  changes light, sky, stars and mood, gates plant photosynthesis, and scales
  each organism's activity and vision by how well its `nocturnal` gene matches
  the darkness (mismatched animals sleep and become easy prey).
- **Instrumentation**: HUD with clock, populations and sim health; click any
  organism to inspect genome, energy, age, generation and behavior state (with
  camera-follow); an **Evolution** tab with population history, per-species
  trait-drift charts, birth/death/generation counters and an event log
  (extinctions, mutants, generation milestones); a **How it works** tab
  explaining all rules in-app.
- **Controls**: pause/speed slider (0–16×, space to pause), seed input,
  restart-same-seed, and new-island buttons. Orbit/zoom/pan camera.

Typical 10-minute sessions (default 3× ≈ 22 island days, ~20+ generations)
show grazer boom-bust waves against plant regrowth, predator-prey cycles,
occasional extinctions or scavenger takeovers, and visible trait drift (e.g.
grazer speed/camo creeping up under predation).

## Implementation notes

- Everything is in one `index.html` (~1,700 lines). Dependencies: `three`
  0.160 via CDN import map. No build, no backend.
- All organisms, plants, rocks and carrion are GPU-instanced; the terrain
  height field is cached into a grid for O(1) lookups; neighbor queries use a
  spatial hash; the sim runs on a fixed 1/30 s timestep with a per-frame step
  cap so high speeds shed load instead of freezing the tab.
- Population hard caps: 340 grazers / 240 scavengers / 48 predators.
- `window.sim` is exposed in the console for the curious (e.g.
  `sim.history`, `sim.causes` for death-cause tallies).

## Evaluation pointers

The best file for evaluation is `index.html`. Suggested pass:

1. Open it, watch the HUD populations move; drag to orbit, scroll to zoom.
2. Click an animal → genome/energy/state panel; tick "follow with camera".
3. Open **Evolution** → population waves, trait drift, mutant/extinction log.
4. Push the speed slider right (8–16×) and watch a few generations turn over;
   compare trait averages after ~5 minutes.
5. Hit 🎲 **New island** — different terrain, plant layout, founder traits;
   the seed field reproduces any run.

## Notes / limitations

- Needs internet once to fetch Three.js from jsDelivr (the only external
  dependency).
- Ecology is tuned for drama rather than equilibrium: extinctions are real and
  permanent within a run (a low-density budding fallback exists but a starving
  last survivor can still die). Different seeds produce meaningfully different
  outcomes — that is intended.
- Determinism is per-step, not per-wallclock: the same seed replays the same
  island and founders; long runs diverge slightly with frame timing because
  step counts per frame vary.
