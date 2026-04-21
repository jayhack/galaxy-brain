# cvchess-in-browser — cursor-composer-2-fast

## Open the demo (no install)

[Open `index.html`](./index.html) directly in Chrome, Firefox, or Safari (`File → Open` or drag the file into the window).

The page loads **OpenCV.js 4.8.0** from the official docs CDN (`docs.opencv.org`). You need network access the first time so `opencv.js` can load; after that the browser may cache it. **All image processing runs locally in the tab** — there are no remote vision APIs.

Use **Upload photo** for your own chess-board image, or click a **sample** in the gallery (images are generated on-canvas in-page — no fetches).

If your browser blocks `file://` loads of the CDN script, run a static server from this directory:

```bash
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

## What it does

Single self-contained HTML: finds a **largest quadrilateral contour** (fallback: full image), **perspective-warps** to a square, measures **per-cell gray medians**, compares to expected light/dark-square levels, and shows **occupancy** plus a coarse **piece color** guess (white vs black). Draws the **detected quad** and an **8×8 grid** overlay on the input image, plus a **FEN-style** position string and a small **8×8 readout**.

Mirrored for GitHub Pages: `docs/artifacts/cvchess-in-browser/cursor-composer-2-fast.html`.
