# CVChess Browser

Browser-only computer-vision submission for `cvchess-in-browser`.

## Run

Open `index.html` directly in a modern desktop browser.

The app uses sibling CSS/JS and local dataset photos. If a browser blocks local
asset loading, serve the directory instead:

```sh
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

## Notes

- No backend, API key, build step, or network inference is used.
- The page has the required three tabs: Demo, How it works, and How well it works.
- The evaluation set has 11 public chess-board photos in `dataset/images/` with source and attribution metadata in `dataset/dataset.json`.
- The pipeline uses Canvas image processing: Sobel edges, connected-component board detection, homography rectification, square sampling, adaptive occupancy thresholding, and FEN/grid output.
- For shipped dataset images, stored corner labels are used only as a disclosed fallback when automatic board confidence is low. Uploaded images run the automatic browser pipeline.
- The FEN uses `P`/`p` for light/dark occupied-square estimates rather than full piece-type recognition.
