# life-sim — claude-code-opus-4-7

## Open the demo (no install)

[Open `index.html`](./index.html) directly in Chrome, Firefox, or Safari (`File → Open`, or drag the file into the window).

The page loads **Three.js r170** and **OrbitControls** from **esm.sh** on first open, so you need a live network connection the first time you open it. Everything else — sim, genome, charts, day/night — is in this one file.

If your browser blocks local `<script type="module">` execution, serve the directory instead:

```
npx http-server -p 5173 .
# or
python3 -m http.server 5173
```

and open `http://localhost:5173/`.

## What it does

A single-file 3D artificial-life island called **Isle of Drift**.

- **Randomly generated island** from a value-noise heightmap with radial falloff — terrain, beach, grass, forest, rock, shoreline, and an offshore sea plane. The seed is visible in the HUD and the URL, and **New island** reseeds terrain, plants, and starting populations.
- **Three heritable animal species** sharing the same 8-gene vector (`size, speed, metab, sense, fertility, aggression, nocturn, hue`):
  - **Grazers** — eat plants, flee hunters, mate in herds.
  - **Hunters** — chase slow grazers, rest when full, leave carcasses.
  - **Scavengers** — track carcasses, stalk hunters for scraps.
- **Plants** live on a 64×64 cell grid that regrows faster in daylight and in lowlands. Grazers harvest their cell; visible grass tufts scale with cell energy.
- **Reproduction** = crossover of parent genomes + gaussian mutation (σ=0.06 per gene, 12 % chance of a σ=0.25 big-jump). Costs 40 % energy per parent. Lineage ids persist on each animal.
- **Body types visibly change** — scale tracks `size`, base hue tracks species + `hue` gene, hunter tail and grazer horn silhouettes come from merged primitives, energy deficit darkens the coat. You can see mutant oversized grazers and stealthy near-black hunters emerge across runs.
- **Day / night cycle** (~4 simulated minutes per day) sweeps sun, moon, ambient, sky color, and fog. Nocturnal-gene animals get a sense/speed bonus at night and a penalty by day; plants regrow ~2× faster in daylight.
- **Real-time controls**: speed slider (0.25× → 60× with a log curve), pause, new island with seed input, and click-to-inspect any animal to see genome bars, energy/life, state, generation, kids, kills, and ancestor ids.
- **Evolution tab** has scrolling charts for population history (main + mini), grazer `size` mean ±1σ, hunter `speed`, scavenger `sense`, and a nocturnality distribution across all species.

## Reading the simulation

- Watch the bottom chart during the first 2–3 minutes — grazer and hunter lines classically lag each other into a predator-prey cycle.
- Hunters over-hunt → grazer crash → hunter crash → grazer rebound. Survivors have shifted body size.
- Scavengers surge whenever hunters feed heavily and drift downward when the kills dry up.
- After ~5 minutes the population-level patterns are clearly non-trivial: the trait-mean charts on the **Evolution** tab diverge, extinctions show up as terminating lines, and new generations (visible as `gen ≥ 8` in the HUD) carry visibly different body proportions.

## Performance notes

- One `InstancedMesh` per species (grazers capped at 220, hunters 50, scavengers 60) and one for carcasses. Plants batch into one instanced cone mesh.
- A uniform spatial hash (2-unit cells) answers neighbour queries in O(1).
- At the default 1× speed the sim steps real time; at 60× the loop substeps so the integrator stays stable.

Mirrored for GitHub Pages at `docs/artifacts/life-sim/claude-code-opus-4-7.html`.
