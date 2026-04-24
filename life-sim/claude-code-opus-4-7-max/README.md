# Verdant Drift

[Open the playable simulation](./index.html)

A single-file Three.js artificial-life island. Every seed builds a new
heightmapped island with meadows, forests, rocky highlands, sandy shore, and
shallows. Three ecological roles interact through explicit rules, reproduce
with uniform-crossover + gaussian-mutation genomes, and visibly change body
type over minutes of real time as trait drift accumulates.

## Run

Open `index.html` directly in a desktop browser (Chrome, Safari, Firefox).

If your browser blocks ES module imports from a `file://` URL, serve the
folder:

```sh
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

## Controls

- **Drag** to orbit · **scroll** to zoom · **right-drag** to pan.
- **Click** any organism to inspect its traits, state, energy, lineage, and
  decisions. The inspector follows the creature until it dies.
- **Speed slider** / preset chips to pause, slow, or accelerate the sim.
  Keyboard: `space` to pause, `1` `2` `3` `4` for 1× 2× 4× 8×, `5` for 0.5×.
- **Seed** input + **Go** reproduces a specific run; **New island** rolls a
  random seed; **Reset** reruns the current seed.
- **How it works** opens an in-app explainer of the genome, behavior FSM,
  reproduction rules, day/night effects, and performance shortcuts.

## What's in the sim

- **Leafers** (green) — herbivores. Graze meadow plants, flee Stalkers, pair
  up and reproduce when well-fed. Body grows legs and ears that scale with
  `speed` and `sense`; armor gene grows visible spines.
- **Stalkers** (red) — predators. Hunt Leafers and Sprites. Get +20% speed
  and up to +60% sensor range at night, so their `nocturnal` gene pressures
  prey to invert their schedules.
- **Tide Sprites** (blue) — shoreline foragers. Eat algae and carrion, leave
  nutrient wakes that help nearby plants regrow. Fast and skittish.

Each organism carries an 8-gene genome (`size`, `speed`, `sense`,
`metabolism`, `armor`, `aggression`, `fertility`, `nocturnal`). Genes affect
both **behavior weights** and the **visible body** (scale, leg length, head
size, tint, spines, fin length). Offspring inherit uniformly-crossed genes
with gaussian mutation (σ ≈ 0.08), so within 5–10 minutes of accelerated time
you can watch size, speed, sense, and nocturnal traits drift in response to
who actually survives to breed.

## Inspectable views

- **Simulation** — live 3D island with HUD, organism click-inspection.
- **Populations** tab — stacked population lines for all three species plus
  plants, plus a smoothed births-vs-deaths-per-minute chart for spotting
  predator-prey oscillations.
- **Traits** tab — per-species gene-drift lines (size · speed · sense + one
  species-signature gene) so you can see selection pressure act on the
  genome, not just population counts.
- **Lineage** tab — current snapshot + max generation depth over time.
- **Events** tab — birth / death / mutation / extinction log with timestamps.
- **How it works** modal — one-click explanation of the whole system.

## Day / night

A simulated day is 120 sim-seconds (scaled by the speed slider). The sun and
moon orbit the island; sky crossfades dawn → noon → dusk → night with stars
visible at midnight. Night raises Stalker sense range and speed, suppresses
plant regrowth, and encourages non-nocturnal species to rest. Nocturnal drift
in prey populations is a real, observable outcome.
