# The Wayfinders' Atlas

A single-file, offline world model **and** voyaging simulation of how
Austronesian/Polynesian peoples crossed the Pacific — from the homeland off
Taiwan out to the three corners of the Polynesian Triangle (Hawaiʻi, Rapa Nui,
Aotearoa).

**▶ Open it:** [`index.html`](./index.html) — double-click it from a fresh clone.
No build step, no server, no API keys, no network required.

Mirrored artifact (same file): `public/artifacts/polynesian-spread/cursor-fable-5-thinking-high.html`,
served on the results site at `/artifacts/polynesian-spread/cursor-fable-5-thinking-high.html`.

## What it is

The page is three layers stacked into one inspectable model:

1. **A world model.** 21 island nodes from the real record — each with a
   settlement-evidence window (radiocarbon / tephra / dated proxies) shown as a
   *range*, not a false-precision point, plus a sourced note. A "World model"
   tab narrates the spread in six movements; a "Debates" tab surfaces the
   genuinely contested pieces; a "Sources" tab lists the primary literature.
2. **A physics layer.** A deliberately coarse, *legible* Pacific oceanography
   (SE/NE trade winds, the equatorial counter-flow, ENSO westerly windows, and
   the major surface currents) combined with a canoe polar (speed, range,
   windward ability) that scores every inter-island crossing.
3. **A solver.** Given fixed voyaging assumptions, a shortest-arrival-time
   search (Dijkstra over the voyaging network) computes *when* — if ever — the
   spread reaches each island. The result is rendered as an animated map, a
   timeline against the evidence, a per-hop trace, a per-island inspector, and a
   verdict.

## The headline question

**What did the canoes and the voyaging strategy have to be capable of to
reproduce the spread we actually observe, within the dates the evidence
allows?** The simulation answers it by being falsifiable. Four built-in presets:

- **Weatherly two-way wayfinding** — reproduces the record (all three corners,
  the long pause, the fast East Polynesian pulse).
- **Drift voyaging only (Sharp 1956)** — square sails, no windward ability,
  one-way: **fails to enter East Polynesia at all**, reproducing the classic
  result of Levison, Ward & Webb's 1973 computer simulation.
- **Marginal canoes, small holds** — reaches the East Polynesian core but
  **strands the far corners** (Hawaiʻi, Rapa Nui) for lack of provisioning range.
- **Climate-driven (heavy ENSO windows)** — modest boats, but frequent westerly
  windows do the upwind work: an alternative success path.

The takeaway you can defend after playing with it: pure downwind drift cannot
explain the eastward push; reproducing the record requires either genuine
windward ability with two-way (return-capable) voyaging *or* a climate regime
that opens the eastward door often enough — and even then, enough provisioning
range to span the final long jumps to the corners.

## How to evaluate (matches the prompt's acceptance criteria)

1. **Open the model.** Double-click `index.html`. The map, winds, voyage tracks,
   and timeline render immediately (the success preset auto-runs and animates).
2. **Read the world model.** Use the right-hand tabs: *World model* (sequence +
   dates + citations), *Debates* (the long pause, EP tempo, upwind vs. drift,
   two-way voyaging & the Americas, Rapa Nui timing), and *Sources*.
3. **Run a simulation.** Drag the **Windward ability**, **Provisioning range**,
   **Canoe speed**, **Navigation skill**, **Westerly windows (ENSO)**, or
   **Voyaging cadence** sliders, toggle **two-way voyaging**, or click a preset,
   then **Run spread**. Watch the verdict flip between success, "stalls / strands
   the corners," and outright failure.
4. **Trace *why*.** Turn on the **wind**, **current**, and **failed-crossing**
   overlays on the map; read the **Run trace** (every hop with its limiting
   physics — distance, point of sail, angle off the wind, landfall odds, window
   wait); and **click any island** to open the *Inspect* tab, which lists every
   incoming route and exactly why it is feasible or blocked.
5. **Timeline vs. record.** Grey bars are the evidence windows; diamonds are this
   run's arrival dates, coloured hit / too-early / too-late / never. The West
   Polynesian "long pause" band is drawn in.

## Files

- `index.html` — the complete deliverable (world model + simulation; vanilla JS,
  HTML5 canvas, no dependencies).
- `_tune.mjs` — a throwaway Node calibration harness used to tune the physics
  constants against the milestone windows. Not needed to view or evaluate the
  page; run with `node _tune.mjs` to see the regime table on the command line.

## Honesty about the model

The oceanography is an analytic, hand-built field, not a reanalysis dataset, and
each crossing is reduced to an expected arrival time — so it is built to be
**legible and falsifiable, not numerically authoritative**. The robust outputs
are the qualitative regimes (drift fails; weatherly two-way voyaging with wind
windows succeeds; marginal range strands the corners), which match the cited
literature. Dates carry the uncertainty the evidence carries; see the *Sources*
tab for the full list.
