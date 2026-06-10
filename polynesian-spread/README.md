# polynesian-spread

## Prompt

Build a computer model of how the Polynesians spread across the Pacific — from
the Austronesian homeland out to the far corners of the Polynesian Triangle
(Hawaiʻi, Rapa Nui, Aotearoa) — and then let an evaluator run **simulations**
against that model.

This is two things at once:

1. **A world model.** Assemble the best of our current knowledge into one
   coherent, inspectable model of the spread: where people came from, the
   sequence and timing of settlement, and the physical world they crossed.
   The richer and more honestly-sourced the model, the better.
2. **A simulation laid over it.** Make the model *runnable*. The headline
   question: **what kind of boats and voyaging behavior are required to
   reproduce the spread we actually observe in the archaeological record,
   within the time frames the evidence allows?** An evaluator should be able
   to change assumptions — vessel speed and range, provisioning, ability to
   sail to windward, navigation accuracy, population pressure, willingness to
   make return voyages — and watch how the simulated spread changes.

What we care about:

- **Grounded in real evidence.** The model should draw on the actual record:
  radiocarbon and settlement dates (Lapita and later), genetic dating and
  admixture signals, linguistic phylogeny, and the physical oceanography of
  the Pacific — prevailing winds and currents, ENSO/seasonal reversals, swell
  patterns, inter-island distances and visibility. Cite your sources; show
  your dates with their uncertainty rather than as false precision.
- **The hard problems are visible.** The spread has genuinely contested
  pieces — the West Polynesia "long pause," the timing and tempo of the East
  Polynesian expansion, upwind vs. downwind colonization, drift vs.
  intentional two-way voyaging. A strong model surfaces these debates instead
  of papering over them.
- **The simulation is honest.** It should be possible to set parameters that
  *fail* to reproduce the record (too-slow boats never reach Hawaiʻi in time;
  pure downwind drift can't explain the eastward push) and parameters that
  succeed. The point is to learn what the voyaging technology had to be
  capable of, not to hardcode the known answer.
- **Inspectable, not a black box.** Whatever drives the simulation — currents,
  wind fields, decision rules — should be legible to someone trying to
  understand the result, through maps, timelines, traces, or charts.

## Deliverable

One committed, browser-openable HTML page that is both the world model and the
simulation. No build step, no server, no API keys; any data or imagery the
page needs is stored locally in the solution folder so it renders from a fresh
clone. CDN-loaded libraries (a map library, a charting library, Three.js) are
fine, but the page must still convey the model if the network is unavailable.
Link to it near the top of your solution `README.md`.

## Acceptance criteria

A fresh evaluator can:

1. Clone the repo and open your committed HTML file directly in a desktop
   browser, with the model rendered (map/timeline intact).
2. Read the world model: where the spread started, the route and sequence,
   and roughly *when* each major region was settled — with the evidence and
   uncertainty behind those dates cited.
3. Run a simulation: change at least the voyaging assumptions (e.g. boat
   speed/range and upwind ability) and observe a different outcome, including
   regimes that fail to reproduce the real spread and regimes that succeed.
4. Trace *why* a run turned out the way it did — see the winds/currents,
   distances, or decision rules that produced the result.
5. Come away with a defensible answer to the headline question: what were the
   boats and the voyaging strategy capable of, given the timeline we observe?

## Results site — artifact button

So the [results site](https://galaxybrain.dev) shows **Open HTML output** for
your submission, mirror the page and register it:

1. Copy it to `public/artifacts/polynesian-spread/<harness>-<model>.html`.
2. On your solution object in [`docs/data.json`](../docs/data.json), set
   `"artifactUrl": "./artifacts/polynesian-spread/<harness>-<model>.html"`.

## Notes for evaluators

This eval tests synthesis across archaeology, genetics, linguistics, and
physical oceanography, plus the modeling chops to turn that synthesis into a
simulation that can be falsified. Judge it on two axes: how faithful and
well-sourced the world model is, and whether the simulation genuinely teaches
something about the voyaging technology rather than replaying a scripted
answer. Reward honesty about uncertainty and contested questions.

Solutions: `<harness>-<model>/` under this folder.
