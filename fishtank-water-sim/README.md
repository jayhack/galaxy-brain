# fishtank-water-sim

## Prompt

Build a **browser-based 3D simulation** of **pouring water into a glass fish tank**
on a **black background**. Ship it as **committed, self-contained HTML** that an
evaluator can open directly in Chrome, Safari, or Firefox on a **MacBook** without
installing dependencies or running a build step first.

You may use **HTML/CSS/JavaScript**, **WebGL**, **Three.js** (including
`Three.js` from a documented CDN), or any other stack that runs in a normal
browser tab. The result should read clearly as a **glass cube tank** with
**water inside**, not an abstract shader toy with no recognizable scene.

### Scene and visuals

1. **Background**: solid **black** (or effectively black) behind the tank.
2. **Tank**: a **transparent “glass” cube** (wireframe edges, glass-like
   material, or equivalent) so the viewer perceives a cubic aquarium.
3. **Water**: visible as **water inside the cube** — not just a flat unrelated
   plane. It should be distinguishable from the glass (color, IOR, fresnel, or
   similar cues are fine).

### Motion (must be animated, not a static screenshot)

4. **Pour-in sequence**: at the start (or after **Reset**), the water **begins
   above** the tank and **falls / streams into** the cube, then **settles** as
   the main volume fills.
5. **Sloshing**: after the pour, the water **continues to move** — visible
   **slosh / wave motion** inside the tank, not instant dead calm.

### Interaction

6. **Mouse ↔ water**: moving or dragging the **mouse** over the view should
   **affect the water** in a noticeable way (e.g. push, impulse, ripple,
   velocity field). How you approximate “fluid” is up to you, but the connection
   between pointer motion and water motion must be obvious when tried for a few
   seconds.
7. **Camera**: the user must be able to **manipulate the camera** with the mouse
   (e.g. orbit / drag rotate; scroll or pinch zoom is optional but nice). The tank
   must remain understandable from different angles.

### Controls and performance

8. **Reset** control: a visible **Reset** button (or clearly labeled control)
   that **restarts** the pour / fill / slosh sequence (same idea as cold start).
9. **Laptop-friendly**: the demo should remain **interactive** on a typical
   MacBook in a desktop browser — brief hitches when resetting are acceptable,
   but it should not **grind to a halt** indefinitely during normal use.

## Acceptance criteria

A submission passes if a fresh evaluator can:

1. Clone the repo, `cd` into the solution directory, and follow the solution
   `README.md`.
2. Open a **committed HTML file** directly in the browser (or via one documented
   command that only serves static files, if you document it) with **no npm
   install / bundle step required** before that file exists.
3. See a **black-backed** scene with a **clearly readable glass cube** and
   **water that occupies the interior** of that cube.
4. Watch an initial phase where water **starts above** the tank and **enters** it,
   then SEE **ongoing sloshing** inside the cube afterward.
5. **Drag or move the mouse** and see the water **react** in a visible way.
6. **Drag (or otherwise manipulate)** the camera and still recognize the tank and
   water.
7. Click **Reset** and see the **pour / slosh** scenario start over.

### Ship a committed playable HTML

Every submission must include at least one **committed, browser-playable HTML
file** inside the solution directory. The solution `README.md` must link to it
near the top so the evaluator can open the demo immediately.

If you mirror the same file under `docs/artifacts/fishtank-water-sim/<harness>-<model>.html`
for GitHub Pages, set `artifactUrl` in `docs/data.json` per the root repository
README (“HTML artifacts (GitHub Pages)”).

## Out of scope

- Scientifically exact Navier–Stokes or offline fluid baking.
- Multiplayer, networking, or persistence.
- Mobile-first or touch-only UX (desktop + mouse is the target).
- Audio unless you really want it — not required for passing.

## Notes for evaluators

The goal is a **convincing fish-tank pour + slosh** with **mouse-driven fluid
disturbance** and **orbiting camera**, shipped as **one coherent HTML artifact**
suitable for quick review on a laptop.

Approximate fluid (heightfield, particles + metaballs, MLS-MPM-lite, etc.) is
fine; the rubric is **legibility of the illusion** and **responsive
interaction**, not research-grade simulation.

Solutions live under `<harness>-<model>/` subdirectories.
