# oblique-gambit

A browser-only solution to the [cvchess-in-browser](../../README.md) eval.
Extracts a chess-board position (occupancy + side) from an oblique-angle photo
using a classic CV pipeline built on OpenCV.js (WebAssembly). No server-side
inference, no hosted vision APIs.

## Run it

OpenCV.js loads from a CDN and its WebAssembly module requires an `http://`
origin (it will not load from `file://`). Serve the directory with any static
file server and open `index.html`:

```sh
cd cvchess-in-browser/claude-code-opus-4-7/oblique-gambit
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

The three tabs:

- **Demo** — drag-and-drop an image (or pick one from the 10-image gallery);
  the pipeline runs and draws detected corners, the rectified 512×512 board,
  per-square classification, a chess-diagram readout, and a FEN string
  (occupancy + side only, no piece-type).
- **How it works** — stage-by-stage explainer with live canvases (input →
  edges → largest quad → rectified → per-square occupancy) plus short code
  excerpts.
- **How well it works** — per-image results table and aggregate metrics from
  running the pipeline on the shipped dataset, with an honest discussion of
  the synthetic-vs-real gap and what falls over.

## What's in here

- `index.html`, `app.css`, `app.js` — the page and UI controller.
- `pipeline.js` — the CV pipeline (`PL.run(imgElem)` → `{ ok, fen, grid,
  stages, orientation, board, timing, ... }`).
- `dataset.json` + `dataset/*.jpg` — 10 synthetic board renders with
  per-square ground-truth occupancy and side, covering five board styles
  (wood, tournament, blue-white, vinyl, themed) and pitches from ~30° to
  ~68°.
- `precomputed/results.json` — frozen results of the full pipeline run on
  the shipped dataset; the "How well it works" tab uses these if present,
  otherwise it runs everything live.
- `tools/gen_dataset.py` — regenerates the synthetic dataset (PIL; no other
  deps).
- `tools/build_manifest.py` — converts the per-image FEN into the per-square
  occupancy/side grids in `dataset.json`.
- `tools/bundle.py` — produces the self-contained mirrored artifact under
  `docs/artifacts/cvchess-in-browser/` by inlining CSS/JS/dataset JSON and
  encoding each dataset image as a data URI.

## Dataset honesty

The shipped dataset is **synthetic**. See the "How well it works" tab for
the full discussion — in short, we rendered it because it gives exact
per-square ground truth and broad camera/style coverage without scraping
licensed photos. The homography step is exercised, but real phone photos
will regress specifically when (a) board-vs-table contrast is weak,
(b) piece style drifts far from the training distribution (n/a here, but
matters for a future piece-type head), or (c) the board is non-planar or
heavily occluded. The **Demo** tab accepts arbitrary uploads so a reviewer
can hit each of these modes directly.

## Results on the shipped dataset

| Metric | Value |
| --- | --- |
| Board detected (quad found) | 10 / 10 |
| Mean per-square occupancy accuracy | 90.0% |
| Mean side accuracy (W vs B, among occupied) | 73.4% |
| Full-board exact match (occupancy + side) | 1 / 10 |
| Runtime per image (desktop, 720 px long edge) | ~290 ms |

Piece-type recognition is explicitly out of scope for this submission (the
FEN uses `P`/`p` as placeholders for "white occupied" / "black occupied").
The bottleneck on full-board exact match is side classification on the
dense starting-position images, where every non-empty square is a pawn and
local tile color is the only cue.
