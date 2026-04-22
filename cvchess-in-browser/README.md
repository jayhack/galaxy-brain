# cvchess-in-browser

## Prompt

Build a **browser-based computer vision app** that extracts the state of a
chess board from a **photo of a physical board taken from an oblique angle**,
in the spirit of [jayhack/CVChess](https://github.com/jayhack/CVChess)
(CS231A, 2014) — except everything runs **inside the browser window**, with
**no server-side inference**.

The boards in the wild are not flat overhead shots. Expect what you'd see in
tournament photos, living-room shots, and product listings: slanted
perspectives, tilt, cropping, varied lighting and board styles. **The algorithm
must handle oblique views**, not just top-down boards. That almost certainly
means detecting the four board corners (or the board outline) and applying a
homography to rectify the 8×8 grid before classifying squares.

### What the agent is being asked to do

This eval is not only about shipping code — it's about **iterating on a CV
algorithm against a real dataset and then writing up the result**.

Concretely, the agent must:

1. **Assemble an evaluation dataset** of chess-board photos from publicly
   available sources (e.g. Google Images search for things like "chess board
   from above", "chess game tournament", "chess set on table"). **At least 8
   images**, spanning a range of:
   - camera angles (closer to top-down ↔ strongly oblique),
   - board styles (wood, vinyl, tournament, digital/e-board, themed sets),
   - lighting conditions / photo quality.
   Save the images inside the solution and record the source URL / attribution
   for each one in a `dataset.json` (or similar) that also stores, per image,
   the **expected** board state or occupancy when feasible (full starting
   position, a known midgame, empty board, etc.), so the agent can actually
   score itself.
2. **Build the CV pipeline** and iterate on it: run it against the dataset,
   inspect failures, adjust parameters / heuristics / models, rerun. The final
   submission should reflect that loop — not a single guess.
3. **Write up the result** in the UI so a reviewer can see *what the algorithm
   does* and *how well it works*, not just poke at a demo.

### Deliverable: one HTML with three tabs

Ship **one self-contained, browser-runnable web page** inside the solution
directory (usually `index.html`, optionally with sibling JS/CSS/model/image
files). The page must be organized as **three tabs**:

#### Tab 1 — **Demo**

A working CV app:

- **Input selection:** either **upload an image** (file picker and/or
  drag-and-drop) **or pick one** from the shipped evaluation dataset (the
  gallery doubles as a "search images" affordance).
- **Pipeline runs in the browser** (JS / WebAssembly / WebGL / WebGPU / canvas
  — anything client-side). OpenCV.js, TensorFlow.js, ONNX Runtime Web,
  MediaPipe, pure-JS CV are all fair game. Heuristic approaches and learned
  classifiers are both welcome, as long as any **model weights ship inside the
  solution** and inference happens client-side.
- **Visualization:** the detected board (corners + rectified grid) drawn over
  (or beside) the input image, with per-square classification.
- **Readout:** a board-position readout — **FEN string**, an 8×8 grid of
  labels, or a rendered chess diagram — so a reviewer can compare the
  extraction against the input photo.
- **Progress/feedback** while the pipeline runs (spinner, stage markers, etc.
  — this isn't instant on a phone photo).

#### Tab 2 — **How it works**

An **explainer of the algorithm itself, with graphics**. Not a dry wall of
text. Walk the reader through the pipeline stage by stage — e.g. edge / line
detection → board-corner localization → homography / rectification → square
segmentation → per-square occupancy/piece classification → FEN assembly.
For each stage, show what's actually happening:

- annotated images from the dataset (with detected edges / corners / grid /
  per-square crops drawn in),
- short diagrams or animations where they help,
- a few lines of math or pseudocode where they clarify the step.

A reader should leave this tab understanding how the pipeline works end-to-end,
not just what the buttons in the demo do.

#### Tab 3 — **How well it works**

An **analysis of the algorithm's performance on the evaluation dataset**:

- Run the pipeline on every dataset image and report results — per-image
  **board-level** score (correct occupancy, correct FEN, etc.) and aggregate
  metrics (overall accuracy, per-stage success, something like confusion of
  "empty vs. occupied").
- Call out **where the algorithm fails** with concrete examples from the
  dataset (which image, which stage, why).
- Honest framing: which angles / board styles / lighting conditions it handles
  well, which it doesn't, and what would be needed to close the gap.
- Precomputed tables/charts are fine; so is re-running the pipeline in-browser
  on the dataset when the tab opens, as long as it terminates in a reasonable
  time.

### Deliverable checklist

Commit inside the solution directory:

- The entry HTML (and any sibling JS/CSS/model files it needs).
- The **evaluation dataset** of **at least 8 images** (plus a
  `dataset.json`-style manifest with source URL, attribution, and — where
  possible — ground-truth board state / occupancy).
- Any **model weights**, classifier files, or precomputed results the pipeline
  or analysis needs, so the app works **offline after page load**.

Opening the deliverable in a modern desktop browser must be enough — **no
backend**, **no API key**, **no build step before a playable HTML exists**.
Serving the directory with `python -m http.server` (or similar) is allowed if
the browser's `file://` protocol blocks local fetches.

## Acceptance criteria

A submission passes if a fresh evaluator can:

1. Clone the repo, `cd` into the solution directory, and follow the solution
   `README.md`.
2. Open the committed HTML (directly or via one documented static-file-server
   command) and see the page load with three visible tabs: **Demo**,
   **How it works**, **How well it works**.
3. On the **Demo** tab:
   - Pick an image from the shipped dataset (≥ 8 images, covering a range of
     **oblique angles**, board styles, and conditions) and see the pipeline
     detect the board, show per-square classification, and emit a
     board-position readout.
   - Upload their own oblique-angle chess-board photo and see the same
     pipeline run end-to-end on it, fully in the browser (network tab should
     show **no inference calls** to a remote server).
4. On the **How it works** tab, read a graphics-driven explainer that walks
   through the pipeline stage by stage with annotated images from the dataset.
5. On the **How well it works** tab, see per-image results and aggregate
   metrics on the shipped dataset, plus an honest discussion of failure modes.
6. Get **reasonable results** on a majority of the dataset images — the board
   should be detected on most oblique-angle photos and empty-vs-occupied
   should be roughly right. Piece-type recognition is a plus but not required
   for the submission to pass.

## GitHub Pages — artifact button

So the [results site](https://jayhack.github.io/galaxy-brain) shows **Open HTML
output** and **Open artifact** for your submission, mirror the playable file
and register it:

1. Copy the entry HTML (bundled or with its sibling assets) to
   `docs/artifacts/cvchess-in-browser/<harness>-<model>.html` (same name as
   your solution folder under this eval). Inline or fetch sibling assets as
   needed so the mirrored file still works when opened from
   `docs/artifacts/…`.
2. On your solution object in [`docs/data.json`](../docs/data.json), set
   `"artifactUrl": "./artifacts/cvchess-in-browser/<harness>-<model>.html"`.

See the repo root
[README — HTML artifacts (GitHub Pages)](../README.md#html-artifacts-github-pages)
for the full convention.

## Out of scope

- Running inference on a remote server or proxying to a hosted vision API —
  the whole algorithm must execute in the browser.
- Live webcam capture (a single still image per run is fine; webcam is a nice
  bonus, not a requirement).
- Move legality, chess engines, PGN history, or game-play. This eval is only
  about **extracting a static board position from an image**.
- Mobile-first UX, multiplayer, accounts, persistence.
- Datasets dominated by overhead / top-down shots only. Oblique-angle coverage
  is the point.

## Notes for evaluators

Think of this as CVChess restaged as a browser tool **with a real eval loop on
top of it**. The interesting questions are:

- **Does the board actually come out on oblique photos?** Not just flat
  overhead shots.
- **Did the agent iterate?** The "How well it works" tab should show that the
  algorithm was actually run against the assembled dataset and the results
  looked at, not just hand-waved.
- **Is the explainer legible?** "How it works" should teach the reader
  something, with graphics, rather than restating the prompt.
- **Is it really in-browser?** No server inference, no hidden API calls.
- **Is the demo UI legible?** Upload + gallery, overlay, and a readable
  board-position readout.

Solutions: `<harness>-<model>/` under this folder.
