# cvchess-in-browser — claude-code-opus-4-7

## Open the demo (no install)

Either:

- Open [`index.html`](./index.html) directly in Chrome / Firefox / Safari (`File → Open`, or drag the file in), **or**
- Serve the directory locally if your browser blocks module fetches from `file://`:

  ```sh
  python3 -m http.server 8000
  # then open http://localhost:8000/cvchess-in-browser/claude-code-opus-4-7/
  ```

OpenCV.js (4.10) is loaded from `docs.opencv.org` on first open — a live network connection is needed once. After that, everything — corner detection, perspective warp, per-square classification, FEN emission — runs **entirely in the browser** (JS + WebAssembly). No server inference, no API keys, no backend.

## What it does

A single self-contained HTML with a full in-browser CV pipeline:

1. **Gallery.** Four procedurally-generated chess-board "photos" are rendered client-side at page load (start position, Italian game, an endgame, and a sparse mid-game), including a perspective warp that simulates a camera angle. Click any tile to run it through the pipeline.
2. **Upload / drag-and-drop.** Pick a real chess-board photo from disk; the pipeline runs on the same code path as the gallery.
3. **Corner detection.** Tries OpenCV's `findChessboardCornersSB` on a grayscale copy to locate the inner 7×7 corner grid, then extrapolates the four outer corners by extending one square width in each direction. Falls back to `findChessboardCorners` + `cornerSubPix` on OpenCV.js builds that don't expose SB.
4. **Manual fallback.** If auto-detect fails (cropped board, glare, unusual tiling), a **Click 4 corners** button switches the input canvas to click-to-label mode — evaluator clicks `a8 → h8 → h1 → a1` and the pipeline continues.
5. **Perspective warp.** `cv.getPerspectiveTransform` + `cv.warpPerspective` rectify the board to a top-down 512×512 view. Shown in the UI alongside the input with a blue grid overlay.
6. **Per-square occupancy classification.** Each 64×64 cell is scored on three signals — centre-region **variance**, **Canny edge density**, and **brightness deviation** from the calibrated expected tone for that colour square — and declared **empty** or **occupied**.
7. **Piece-colour classification.** For occupied squares, mean brightness of an inner patch is compared to the expected square tone to decide **light piece** vs **dark piece**. (Full piece-type recognition is called out as a bonus in the prompt; this submission uses `P` / `p` as a stand-in for "occupied light-coloured" / "occupied dark-coloured".)
8. **Outputs.** FEN string (copyable), 8×8 ASCII grid, and an SVG chess diagram — all three update together. A **Flip board** button lets the evaluator re-orient if the picture is taken from the opposite side.
9. **Pipeline timings.** Each stage's wall time (`Load image`, `Detect corners`, `Warp`, `Classify`, `Emit FEN`) is shown on the side panel so it's easy to see where a run spends its time.

## Acceptance-criteria map

- **Sample gallery, no evaluator-supplied image needed** → four tiles that render on page load.
- **Upload your own image** → file picker *and* drag-and-drop on the input card.
- **Detected board visualised on the input** → blue polygon + 8×8 grid + `a8/h8/h1/a1` corner pins.
- **Per-square classification overlay** → occupancy dots on the rectified 512×512 warp.
- **Board-position readout** → FEN string, ASCII grid, and a rendered SVG diagram.
- **Runs in the browser with no server inference** → network tab shows only the OpenCV.js WASM fetch on first load, no POSTs to any inference endpoint at classify time.

## Known limitations

- Piece-type classification (`K/Q/R/B/N/P`) is not attempted — FEN uses `P/p` for light/dark occupancy. The prompt marks full piece typing as a bonus.
- The heuristic thresholds in [`index.html`](./index.html) (`centreStd > 18`, `edgeDensity > 0.06`, `deviation > 35`) were tuned on the synthetic gallery. A real photo with very washed-out lighting or an unusual board palette may need the manual-corner fallback and/or a re-run.
- Auto-detect depends on `findChessboardCornersSB` reliably finding the 7×7 inner-corner pattern. Heavy occlusion by pieces on the outer ranks is the most common failure mode; the manual mode handles that.

Mirrored for GitHub Pages at [`docs/artifacts/cvchess-in-browser/claude-code-opus-4-7.html`](../../docs/artifacts/cvchess-in-browser/claude-code-opus-4-7.html).
