# cvchess-in-browser

## Prompt

Build a **browser-based computer vision app** that extracts the state of a chess
board from a photo of a physical board, in the spirit of
[jayhack/CVChess](https://github.com/jayhack/CVChess) (CS231A, 2014) — except
everything runs **inside the browser window**, with **no server-side
inference**.

Ship **one self-contained HTML deliverable** an evaluator can open directly. It
must let the user either:

- **Upload an image** from disk (file picker and/or drag-and-drop), or
- **Pick from a built-in gallery** of sample chess-board images that ship with
  the solution ("search images").

When an image is selected, the app runs a **CV pipeline in the browser** (JS /
WebAssembly / WebGL / WebGPU / canvas — anything that stays on the client) that:

1. **Detects the chessboard** in the image (perspective-warp the 8×8 grid to a
   rectified top-down view).
2. **Segments the 64 squares** and classifies each square as **empty** or
   **occupied**, and ideally — where possible — by **which piece / color**.
3. **Reports a board position**, for example as a **FEN string**, an 8×8 grid
   of labels, or an on-screen chessboard overlay, so the evaluator can compare
   the extraction against the input photo.

The algorithm must be **written as browser-runnable code** — not just wrapping
a remote API. Libraries like OpenCV.js, TensorFlow.js, ONNX Runtime Web,
MediaPipe, pure-JS CV, etc. are all fair game. Heuristic approaches (Hough
lines + color/occupancy heuristics, like the original CVChess) are explicitly
welcome; so are learned classifiers **as long as the model weights ship inside
the solution** and inference happens client-side.

### UI requirements

- A clear way to **upload** an image and a clear way to **pick a sample** from
  the shipped gallery.
- The **detected board** visualized on top of (or next to) the input image:
  corners, square grid overlay, and the classification per square.
- A **board-position readout** (FEN string, 2D grid, or a rendered chess
  diagram) that updates when a new image is processed.
- Some feedback while the pipeline runs (spinner, progress text, or stage
  markers are fine — this is not instant on a phone photo).

### Deliverable

Commit:

- A browser-runnable entry point (usually `index.html`, optionally with
  accompanying JS/CSS/model/sample-image files) inside the solution directory.
- A handful of **sample chess-board images** bundled with the solution that
  the gallery/search can open without the evaluator needing to supply their
  own photos.
- Any **model weights**, classifier files, or precomputed assets the pipeline
  needs, so the app works **offline after page load**.

Opening the deliverable in a modern desktop browser must be enough — **no
backend**, **no API key**, **no build step before a playable HTML exists**.
Serving the directory with `python -m http.server` (or similar) is allowed if
the browser's file:// protocol blocks fetches.

## Acceptance criteria

A submission passes if a fresh evaluator can:

1. Clone the repo, `cd` into the solution directory, and follow the solution
   `README.md`.
2. Open the committed HTML file directly (or via one documented
   static-file-server command) and see the app load in the browser.
3. **Pick a sample image** from the built-in gallery and see the app:
   a. Detect the board in that image,
   b. Show a per-square classification overlay,
   c. Emit a board-position readout (FEN, grid, or rendered diagram).
4. **Upload their own image** of a chess board and see the same pipeline run
   end-to-end on it, fully in the browser (network tab should show **no
   inference calls** to a remote server).
5. Get **reasonable results** on at least the shipped gallery images — empty
   vs. occupied squares should be roughly right on a clear overhead or slanted
   board photo. Piece-type recognition is a plus but not required for the
   submission to pass.

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

## Notes for evaluators

Think of this as a reimagining of CVChess as a browser tool. The interesting
question is **how the agent composes a full CV pipeline out of browser-native
pieces** (line detection, homography, per-square crop + classifier) and makes
the extraction legible in the UI, not whether the classifier hits
grandmaster-grade piece recognition.

Judge on:

- **Does the board come out?** On a clean photo, is the detected grid
  obviously aligned with the physical board?
- **Is occupancy reasonable?** Empty vs. occupied should be close to right;
  piece-type guesses are a bonus.
- **Is it really in-browser?** No server inference, no hidden API calls.
- **Is the UI legible?** Upload + gallery, overlay, and a readable
  board-position readout.

Solutions: `<harness>-<model>/` under this folder.
