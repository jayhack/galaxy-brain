# Trophic Drift Atoll

[Open the playable simulation](./index.html)

Trophic Drift Atoll is a single-file Three.js artificial-life island with seeded terrain, resource patches, shoreline algae, carrion, three ecological roles, inherited mutable genomes, and visible body-shape drift.

## Run

Open `index.html` directly in a desktop browser.

If your browser blocks module imports from a local file, serve this directory:

```sh
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

## Controls

- Drag to orbit the camera and scroll to zoom.
- Click an organism to inspect its energy, health, age, behavior, lineage, and genes.
- Use the speed slider to pause, slow, or accelerate the ecology.
- Enter a seed and press Reset to reproduce a run, or press New island for a new seeded island.

## Ecology

- Valehoppers graze meadow biomass, flee predators, and evolve body size, armor, speed, and sensing around food pressure.
- Riftstalkers hunt the other species. Darkness improves their sensor range and pursuit speed, so predator-prey cycles visibly change across the day-night loop.
- Tidegliders patrol the shoreline, eat algae and carrion, avoid predators, and leave nutrient wakes that increase local regrowth.

Organisms reproduce by pairing with nearby mature partners when both have enough energy. Offspring inherit a crossover genome with mutation, so traits affect both survival and visible silhouettes over a single accelerated viewing session.
