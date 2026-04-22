# life-sim

## Prompt

Build a **browser-viewable 3D life simulation** on an island where organisms of
different species compete, reproduce, mutate, and visibly evolve over time.

The simulation should feel like a small artificial ecology rather than a
decorative particle system. An evaluator should be able to open the committed
browser artifact, start from a randomly generated island, watch populations
rise and fall, inspect why organisms are succeeding, and see body types shift
over the course of roughly **10 minutes of real time**.

The stack is open: Three.js, Babylon.js, WebGPU, raw WebGL, canvas overlays, or
any browser-friendly approach is fine. The final experience must run locally in
a desktop browser without API keys or a backend.

## What the simulation must include

### A generated island world

- A 3D island with terrain, shoreline / water, vegetation or other resources,
  and spatial variation that matters to the simulation.
- **Randomly generated initial circumstances**: terrain features, resource
  distribution, starting populations, and at least some trait variation should
  differ between runs.
- A visible seed or equivalent reproducibility control, plus a way to generate
  a new island.
- A camera the evaluator can control well enough to inspect organisms and the
  island from different angles.

### Multiple species and ecological pressure

- At least **three distinguishable species or ecological roles**. Examples:
  grazers, predators, scavengers, pollinators, burrowers, amphibious shoreline
  feeders, nocturnal hunters.
- Species must interact through meaningful competitive dynamics: predation,
  resource competition, territory pressure, mating competition, avoidance,
  symbiosis, or other explicit ecological mechanics.
- Organisms should make local decisions based on sensed state, not simply move
  on independent random paths. Hunger, fear, mate seeking, energy, health, age,
  or circadian behavior are all reasonable signals.

### Reproduction and evolution

- Organisms must have a heritable genome or trait vector. Body traits can be
  primitive, but they need to affect behavior and survival. Examples:
  size, speed, energy efficiency, sensor range, camouflage, armor, aggression,
  mouth shape, leg length, fertility, metabolism, nocturnal preference.
- Reproduction must create offspring with inherited traits and mutation.
  Crossover or sexual selection is a plus, but not required.
- Evolution must be fast enough that an evaluator sees something interesting
  happen in one sitting: adaptation, extinction, predator-prey cycling, trait
  drift, body-size divergence, island niches, or runaway collapse.
- The body type should be visible in the world. It is fine if bodies are made
  from simple geometry, but trait changes should alter recognizable shapes,
  colors, proportions, appendages, motion, or silhouettes.

### Real-time controls

- A **speed slider** that can slow, pause, and accelerate the simulation.
- Reset / new island controls.
- A readable HUD with current time, population counts, selected organism
  details, and basic simulation health.
- The simulation should remain usable on a laptop browser. It may simplify
  distant organisms, cap population, or use instancing / batching, but it
  should not become unusable after a few minutes.

### Day / night and beauty

- A visible day / night cycle with changing light, sky, and mood.
- Day / night should have at least one behavioral or ecological consequence,
  such as nocturnal predators, resource regrowth, sleep, visibility changes,
  temperature pressure, or altered movement costs.
- The scene should be visually appealing: water, lighting, terrain color,
  organism silhouettes, motion, and UI polish all count. The goal is a living
  island an evaluator wants to watch.

## Required browser experience

Ship a committed browser artifact, usually `index.html`, with an experience
organized clearly enough that a reviewer can both play with the sim and
understand what it is doing. A strong submission will usually have these views:

- **Simulation**: the live 3D island, controls, organism selection, and HUD.
- **Evolution**: charts or panels for population history, trait distributions,
  reproduction events, extinctions, lineages, and dominant body types.
- **How it works**: a concise explanation of the genes, behaviors, resource
  model, reproduction rules, mutation rates, day / night effects, and any
  performance shortcuts.

These do not have to be literal tabs, but the information must be discoverable
inside the shipped experience without reading source code.

## Acceptance criteria

A submission passes if a fresh evaluator can:

1. Clone the repo, `cd` into the solution directory, and follow the solution
   `README.md`.
2. Open a committed HTML file directly in the browser, or via one documented
   static-file-server command if browser security blocks local asset loading.
3. See a 3D island with generated terrain, water / shoreline, resources, and
   multiple visible organism types.
4. Generate a new randomized island and see the seed or equivalent state used
   to reproduce a run.
5. Watch at least three species or ecological roles interact through explicit
   mechanics such as predation, avoidance, mating, and resource competition.
6. Select or inspect organisms and see their traits, energy / health / age, and
   current behavioral state.
7. Observe reproduction that creates mutated offspring with inherited traits.
8. Observe body types changing visibly as traits change, even if the bodies are
   built from simple geometric primitives.
9. Use a speed slider to pause, slow down, and accelerate the simulation.
10. Within roughly **10 minutes of real time at the default or accelerated
    speed**, see non-trivial ecological or evolutionary dynamics: extinctions,
    predator-prey cycles, niche specialization, trait drift, adaptation to the
    island layout, or another clear population-level pattern.
11. See a day / night cycle that changes the scene visually and affects at
    least one simulation rule.
12. See charts, lineage traces, event logs, or other evidence that the
    evolutionary algorithm is actually running rather than being narrated.

### Ship a committed playable artifact

Every submission must include at least one **committed, browser-playable HTML
file** inside the solution directory. The solution `README.md` must link to it
near the top so the evaluator can open the simulation immediately.

This is a hard requirement. If the only way to view the simulation is to
install dependencies and run a build before any playable HTML exists, the
submission does not pass.

## GitHub Pages - artifact button

So the [results site](https://jayhack.github.io/galaxy-brain) shows **Open HTML
output** and **Open artifact** for your submission, mirror the playable file
and register it:

1. Copy it to `docs/artifacts/life-sim/<harness>-<model>.html` (same name as
   your solution folder under this eval).
2. On your solution object in [`docs/data.json`](../docs/data.json), set
   `"artifactUrl": "./artifacts/life-sim/<harness>-<model>.html"`.

See the repo root
[README - HTML artifacts (GitHub Pages)](../README.md#html-artifacts-github-pages)
for the full convention.

## Out of scope

- Scientific biological realism beyond what is needed to make the simulation
  coherent and inspectable.
- Server-side simulation, hosted inference, databases, accounts, multiplayer,
  or persistence across restarts.
- Exact fluid, weather, cellular, or physics simulation. Approximate models
  are fine if their effects are visible and explained.
- A huge open world. A dense, well-instrumented island is better than a large
  empty one.
- Mobile-first controls.

## Notes for evaluators

Judge the submission as an artificial life system, not just a graphics demo.
The core question is whether local organism rules, inherited traits, mutation,
selection pressure, and environment variation combine into dynamics you can
actually see and inspect.

A passing submission does not need photorealistic creatures or academic-grade
evolutionary biology. It does need the loop to be real: organisms consume,
compete, reproduce, mutate, die, and leave behind enough traces that the
evaluator can tell what changed and why.

Solutions: `<harness>-<model>/` under this folder.
