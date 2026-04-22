# Speciation Isle

[Open the playable simulation](./index.html)

Speciation Isle is a single-file Three.js artificial-life island. It generates a seeded terrain, plant and shoreline resources, and founder populations for three ecological roles:

- Mossbacks: plant grazers that deplete forage and flee predators.
- Nightstalkers: nocturnal hunters that gain sensor and movement advantages after dark.
- Tidepickers: shoreline scavengers that eat carrion, feed on algae, and fertilize visited cells.

Each organism has inherited genes for size, speed, sensor range, efficiency, fertility, armor, aggression, nocturnal preference, shore affinity, and color drift. Reproduction copies the parent genome with mutation, and those genes change the creature's visible body scale, leg length, antenna length, shell or horn size, fins, bill length, and color tint.

## Run

Open `index.html` directly in a desktop browser.

If the browser blocks module imports from a local file, serve the directory with:

```sh
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

## Controls

- Drag to orbit the camera.
- Scroll to zoom.
- Click an organism to inspect its state and genome.
- Use the speed slider to pause, slow down, or accelerate.
- Use the seed field, reset button, or New island button to reproduce or randomize a run.
