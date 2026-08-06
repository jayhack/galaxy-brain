/*
 * oblique-gambit — in-browser CV pipeline for extracting a chess-board
 * position from an oblique-angle photo.
 *
 * Stages:
 *   1. Resize + pre-process (grayscale, bilateral).
 *   2. Board detection: Canny + morphological close + contour search for the
 *      largest convex quadrilateral with a sensible aspect ratio.
 *   3. Homography rectification to a 512x512 "top-down" board.
 *   4. Per-square occupancy: Laplacian edge energy + luminance variance.
 *   5. Piece-side estimation: compare central pixels of each occupied square
 *      against the running medians of the light / dark tile colours.
 *   6. FEN assembly (occupancy-with-side only — piece type is explicitly out
 *      of scope of this pipeline; see the How it works tab).
 *
 * Depends on OpenCV.js (cv) being loaded and initialised.
 */

const PL = {};
(function (PL) {
  'use strict';

  // ------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------
  const RECT_SIZE = 512;   // size of rectified top-down board (px)
  const SQ = RECT_SIZE / 8; // 64 px per square

  PL.RECT_SIZE = RECT_SIZE;
  PL.SQ = SQ;

  function newMat() { return new cv.Mat(); }

  function orderCorners(pts) {
    // pts is an array of {x,y}. Order as [TL, TR, BR, BL].
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const ordered = [null, null, null, null]; // TL, TR, BR, BL
    for (const p of pts) {
      if (p.x < cx && p.y < cy) ordered[0] = p;
      else if (p.x >= cx && p.y < cy) ordered[1] = p;
      else if (p.x >= cx && p.y >= cy) ordered[2] = p;
      else ordered[3] = p;
    }
    // If any corner is missing (e.g. weird quadrilateral where three points
    // share a half-plane), fall back to an angle-sort around the centroid.
    if (ordered.some(x => x == null)) {
      const sorted = pts.slice().sort(
        (a, b) => Math.atan2(a.y - cy, a.x - cx)
               - Math.atan2(b.y - cy, b.x - cx));
      // start at the point with the most negative angle that's above centroid
      let startIdx = 0;
      let best = Infinity;
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        if (p.y < cy && p.x < cx) {
          const d = Math.hypot(p.x - cx, p.y - cy);
          if (d < best) { best = d; startIdx = i; }
        }
      }
      return [0, 1, 2, 3].map(i => sorted[(startIdx + i) % 4]);
    }
    return ordered;
  }

  function quadArea(pts) {
    // pts in order. Shoelace.
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(a) / 2;
  }

  function quadAspect(pts) {
    // Approximate aspect ratio: min/max of the four edge lengths.
    const edges = [];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      edges.push(Math.hypot(pts[j].x - pts[i].x, pts[j].y - pts[i].y));
    }
    return Math.min(...edges) / Math.max(...edges);
  }

  function isConvex(pts) {
    // Check cross-products of consecutive edges have the same sign.
    let sign = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const c = pts[(i + 2) % pts.length];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (cross !== 0) {
        if (sign === 0) sign = Math.sign(cross);
        else if (Math.sign(cross) !== sign) return false;
      }
    }
    return true;
  }

  // ------------------------------------------------------------
  // Stage 1/2: find board corners
  // ------------------------------------------------------------

  function preprocess(srcMat) {
    // Resize so that max edge ~= 720 and return gray + edges.
    const h = srcMat.rows, w = srcMat.cols;
    const maxEdge = Math.max(h, w);
    const scale = maxEdge > 720 ? 720 / maxEdge : 1;
    const resized = newMat();
    const sz = new cv.Size(Math.round(w * scale), Math.round(h * scale));
    cv.resize(srcMat, resized, sz, 0, 0, cv.INTER_AREA);

    const gray = newMat();
    cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY);

    const bil = newMat();
    // bilateral keeps edges while killing surface texture
    cv.bilateralFilter(gray, bil, 7, 50, 50, cv.BORDER_DEFAULT);

    return { resized, gray, bil, scale };
  }

  function cannyEdges(bil, lo, hi, dilateIter) {
    const edges = newMat();
    cv.Canny(bil, edges, lo, hi, 3, false);
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    const closed = newMat();
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel,
      new cv.Point(-1, -1), 1);
    if (dilateIter && dilateIter > 0) {
      // Fuse the tile-grid edges into one solid region so the OUTER board
      // boundary is recoverable by a single contour even when the
      // board-table contrast is too weak to produce one on its own.
      const dilated = newMat();
      cv.dilate(closed, dilated, kernel, new cv.Point(-1, -1), dilateIter);
      closed.delete();
      kernel.delete();
      edges.delete();
      return dilated;
    }
    kernel.delete();
    edges.delete();
    return closed;
  }

  function findBoardQuad(resized, edges) {
    const contours = new cv.MatVector();
    const hier = newMat();
    // RETR_EXTERNAL: only outermost contours. The board outline is the one
    // big outer contour; inner tile edges are siblings/children of it and
    // would otherwise be picked up first once the interior is dense.
    cv.findContours(edges, contours, hier, cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE);

    const imgArea = resized.rows * resized.cols;
    let best = null;

    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const area = cv.contourArea(c);
      if (area < imgArea * 0.05 || area > imgArea * 0.85) { c.delete(); continue; }
      // try successively larger epsilons until we land on a 4-sided poly
      const peri = cv.arcLength(c, true);
      for (const eps of [0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.07]) {
        const approx = newMat();
        cv.approxPolyDP(c, approx, eps * peri, true);
        if (approx.rows === 4) {
          const pts = [];
          for (let k = 0; k < 4; k++) {
            pts.push({ x: approx.data32S[k * 2], y: approx.data32S[k * 2 + 1] });
          }
          const ordered = orderCorners(pts);
          if (!isConvex(ordered)) { approx.delete(); continue; }
          const a = quadArea(ordered);
          const ar = quadAspect(ordered);
          if (a < imgArea * 0.05 || ar < 0.3) {
            approx.delete();
            continue;
          }
          if (!best || a > best.area) {
            best = { pts: ordered, area: a, aspect: ar };
          }
          approx.delete();
          break;
        }
        approx.delete();
      }
      c.delete();
    }

    contours.delete();
    hier.delete();
    return best;
  }

  // ------------------------------------------------------------
  // Stage 3: homography -> 512x512 top-down
  // ------------------------------------------------------------
  function rectify(srcMat, cornersInSrc) {
    const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      cornersInSrc[0].x, cornersInSrc[0].y,
      cornersInSrc[1].x, cornersInSrc[1].y,
      cornersInSrc[2].x, cornersInSrc[2].y,
      cornersInSrc[3].x, cornersInSrc[3].y,
    ]);
    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0, RECT_SIZE, 0, RECT_SIZE, RECT_SIZE, 0, RECT_SIZE,
    ]);
    const M = cv.getPerspectiveTransform(srcPts, dstPts);
    const rect = newMat();
    cv.warpPerspective(srcMat, rect, M,
      new cv.Size(RECT_SIZE, RECT_SIZE),
      cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
    srcPts.delete(); dstPts.delete(); M.delete();
    return rect;
  }

  // ------------------------------------------------------------
  // Stage 4: per-square occupancy + side
  // ------------------------------------------------------------
  function classifySquares(rectRGBA) {
    // Convert to grayscale and compute a Laplacian energy map once.
    const rectGray = newMat();
    cv.cvtColor(rectRGBA, rectGray, cv.COLOR_RGBA2GRAY);

    const lap = newMat();
    cv.Laplacian(rectGray, lap, cv.CV_32F, 3, 1, 0, cv.BORDER_DEFAULT);
    const absLap = newMat();
    cv.convertScaleAbs(lap, absLap);
    lap.delete();

    // First pass: compute per-square features + keep a cloned centre patch
    // for the later tile-subtraction step.
    const feats = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const x = Math.round(f * SQ);
        const y = Math.round(r * SQ);
        const inset = 6;
        const rect = new cv.Rect(x + inset, y + inset,
          Math.max(1, SQ - inset * 2), Math.max(1, SQ - inset * 2));
        const grayRoi = rectGray.roi(rect);
        const lapRoi = absLap.roi(rect);

        const meanStd = new cv.Mat();
        const std = new cv.Mat();
        cv.meanStdDev(grayRoi, meanStd, std);
        const mean = meanStd.data64F[0];
        const sigma = std.data64F[0];
        meanStd.delete(); std.delete();

        const lapMean = new cv.Mat();
        const lapStd = new cv.Mat();
        cv.meanStdDev(lapRoi, lapMean, lapStd);
        const lapE = lapMean.data64F[0];
        lapMean.delete(); lapStd.delete();

        const cinset = Math.round(SQ * 0.18);
        const cRect = new cv.Rect(
          x + cinset, y + cinset,
          Math.max(1, SQ - cinset * 2), Math.max(1, SQ - cinset * 2));
        const cRoi = rectGray.roi(cRect).clone();

        // Local tile-colour estimate: the four CORNERS of the tile are
        // almost always background (pieces live in the centre), so their
        // luminance is a robust per-square baseline even when global
        // tileMean is skewed by lighting gradients.
        const corner = Math.max(4, Math.floor(SQ * 0.12));
        const cornerRects = [
          new cv.Rect(x + 4, y + 4, corner, corner),
          new cv.Rect(x + SQ - corner - 4, y + 4, corner, corner),
          new cv.Rect(x + 4, y + SQ - corner - 4, corner, corner),
          new cv.Rect(x + SQ - corner - 4, y + SQ - corner - 4, corner, corner),
        ];
        const cornerVals = [];
        for (const crr of cornerRects) {
          const cr = rectGray.roi(crr);
          const mm = new cv.Mat(); const ss = new cv.Mat();
          cv.meanStdDev(cr, mm, ss);
          cornerVals.push(mm.data64F[0]);
          mm.delete(); ss.delete();
          cr.delete();
        }
        cornerVals.sort((a, b) => a - b);
        // Use median of the 4 corners; robust to a stray piece-edge leak.
        const localTileMean = (cornerVals[1] + cornerVals[2]) / 2;

        feats.push({
          rank: r, file: f,
          tileIsLight: ((r + f) % 2 === 0),
          mean, sigma, lapE, cRoi, localTileMean,
        });

        grayRoi.delete();
        lapRoi.delete();
      }
    }

    // Dynamic thresholds.  In highly sparse positions (e.g. empty board) the
    // 35th-65th quantile gap is tiny; we floor the occupancy threshold with
    // an absolute minimum so noise alone can't trip "occupied".
    const sortedByLap = feats.slice().sort((a, b) => a.lapE - b.lapE);
    const lowQ = sortedByLap.slice(0,
      Math.max(8, Math.floor(sortedByLap.length * 0.35)));
    const highQ = sortedByLap.slice(
      Math.floor(sortedByLap.length * 0.65));
    const lowLap = lowQ.reduce((a, f) => a + f.lapE, 0) / lowQ.length;
    const highLap = highQ.reduce((a, f) => a + f.lapE, 0) / highQ.length;

    const sortedBySigma = feats.slice().sort((a, b) => a.sigma - b.sigma);
    const lowSig = sortedBySigma.slice(0, Math.floor(
      sortedBySigma.length * 0.35))
      .reduce((a, f) => a + f.sigma, 0) / Math.max(1,
        Math.floor(sortedBySigma.length * 0.35));
    const highSig = sortedBySigma.slice(Math.floor(
      sortedBySigma.length * 0.65))
      .reduce((a, f) => a + f.sigma, 0) / Math.max(1,
        sortedBySigma.length - Math.floor(sortedBySigma.length * 0.65));

    const lowByColour = { light: [], dark: [] };
    for (const f of lowQ) {
      (f.tileIsLight ? lowByColour.light : lowByColour.dark).push(f.mean);
    }
    const median = arr => {
      if (!arr.length) return NaN;
      const s = arr.slice().sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    };
    const tileLightMean = median(lowByColour.light);
    const tileDarkMean = median(lowByColour.dark);

    // Occupancy thresholds: gap-weighted midpoint + absolute floors so sparse
    // positions (empty / king-only) aren't painted "occupied" everywhere by
    // tile-boundary noise. Also bail early to "all empty" if the whole board
    // has uniformly low laplacian energy.
    const MIN_LAP = 4.0;
    const MIN_SIG_DELTA = 8;
    const sparse = (highLap < Math.max(lowLap * 2.0, lowLap + 3));
    const lapThresh = sparse
      ? Math.max(MIN_LAP, lowLap + 2.0)
      : Math.max(MIN_LAP, lowLap + (highLap - lowLap) * 0.40);
    const sigThresh = sparse
      ? Math.max(lowSig + MIN_SIG_DELTA, lowSig * 2.0)
      : Math.max(lowSig + MIN_SIG_DELTA * 0.5,
                 lowSig + (highSig - lowSig) * 0.40);

    // Contrast between the two tile colours — sets how "far from the local
    // tile mean" a pixel has to be to qualify as "piece".
    const tileContrast = Math.abs(tileLightMean - tileDarkMean);
    const BG_DELTA = Math.max(14, Math.min(40, tileContrast * 0.33));

    // Second pass: emit decision per square.  Side is decided by background
    // subtraction against the local (per-tile) corner-sampled colour — NOT
    // against the global tileLightMean/tileDarkMean — so radial lighting
    // gradients don't flip pieces near the edges of the board.
    const grid = [];
    for (let r = 0; r < 8; r++) {
      const row = [];
      for (let f = 0; f < 8; f++) {
        const feat = feats[r * 8 + f];
        const occupied = (feat.lapE > lapThresh) && (feat.sigma > sigThresh);
        let side = '.';
        let pieceMean = NaN;
        if (occupied) {
          const roi = feat.cRoi;
          const expect = feat.localTileMean; // per-tile baseline
          const bright = new cv.Mat();
          const dark = new cv.Mat();
          cv.threshold(roi, bright, expect + BG_DELTA, 255, cv.THRESH_BINARY);
          cv.threshold(roi, dark, Math.max(0, expect - BG_DELTA), 255,
                       cv.THRESH_BINARY_INV);
          const brightCount = cv.countNonZero(bright);
          const darkCount = cv.countNonZero(dark);
          bright.delete(); dark.delete();

          if (brightCount > darkCount * 1.15 && brightCount > 8) {
            side = 'W';
          } else if (darkCount > brightCount * 1.15 && darkCount > 8) {
            side = 'B';
          } else {
            // Fall back to the global-mean comparison (very rare).
            const mEl = new cv.Mat();
            const sEl = new cv.Mat();
            cv.meanStdDev(roi, mEl, sEl);
            const cm = mEl.data64F[0];
            mEl.delete(); sEl.delete();
            pieceMean = cm;
            side = (cm - expect) >= 0 ? 'W' : 'B';
          }
        }
        row.push({
          occupied,
          side,
          tileIsLight: feat.tileIsLight,
          lapE: feat.lapE, sigma: feat.sigma,
          centerMean: feat.mean, pieceMean,
          localTileMean: feat.localTileMean,
        });
        feat.cRoi.delete();
      }
      grid.push(row);
    }

    rectGray.delete();
    absLap.delete();

    return {
      grid,
      thresholds: { lapThresh, sigThresh, lowLap, highLap, lowSig, highSig, sparse },
      tiles: { light: tileLightMean, dark: tileDarkMean },
    };
  }

  // ------------------------------------------------------------
  // Orientation: decide which way is White. We use heuristic: White pieces
  // (bright on their tile) cluster on one end of the rectified board.
  // ------------------------------------------------------------
  function detectOrientation(classified) {
    const grid = classified.grid;
    // Count White-side marks on the top 2 ranks vs the bottom 2 ranks.
    let topWhite = 0, topBlack = 0, botWhite = 0, botBlack = 0;
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 2; r++) {
        if (grid[r][f].occupied) {
          if (grid[r][f].side === 'W') topWhite++; else topBlack++;
        }
      }
      for (let r = 6; r < 8; r++) {
        if (grid[r][f].occupied) {
          if (grid[r][f].side === 'W') botWhite++; else botBlack++;
        }
      }
    }
    // If white dominates the top → flip 180deg.
    const whiteOnTop = topWhite > botWhite;
    return { flip180: whiteOnTop, topWhite, topBlack, botWhite, botBlack };
  }

  function rotateGrid180(grid) {
    const out = [];
    for (let r = 7; r >= 0; r--) {
      const row = [];
      for (let f = 7; f >= 0; f--) row.push(grid[r][f]);
      out.push(row);
    }
    return out;
  }

  // ------------------------------------------------------------
  // FEN assembly (occupancy-only: 'P' = white occupied, 'p' = black occupied)
  // ------------------------------------------------------------
  function gridToFEN(grid) {
    const rows = [];
    for (let r = 0; r < 8; r++) {
      let out = '', empty = 0;
      for (let f = 0; f < 8; f++) {
        const cell = grid[r][f];
        if (!cell.occupied) { empty++; continue; }
        if (empty > 0) { out += empty; empty = 0; }
        out += cell.side === 'W' ? 'P' : 'p';
      }
      if (empty > 0) out += empty;
      rows.push(out);
    }
    return rows.join('/');
  }

  // ------------------------------------------------------------
  // Main entry points
  // ------------------------------------------------------------
  PL.run = function run(imgElem, opts) {
    opts = opts || {};
    const stages = {};

    const srcMat = cv.imread(imgElem);
    const { resized, gray, bil, scale } = preprocess(srcMat);
    srcMat.delete(); gray.delete();

    // Try a matrix of (canny-thresholds × dilation-amount) and keep the
    // configuration that produces the LARGEST quad (within sane bounds).
    // The extra dilation passes are for boards whose outline has too
    // little contrast against the table — they merge the tile-grid edges
    // into one solid blob whose outer contour IS the board. Picking the
    // largest quad avoids the "first match wins" pathology where a
    // low-dilate config finds a quad that clips the weakest-contrast
    // corner of the board.
    let board = null;
    let edgesKept = null;
    let chosenDilate = 0;
    const configs = [
      { lo: 40, hi: 120, dilate: 0 },
      { lo: 30, hi: 90,  dilate: 0 },
      { lo: 40, hi: 120, dilate: 2 },
      { lo: 25, hi: 75,  dilate: 3 },
      { lo: 20, hi: 60,  dilate: 4 },
    ];
    for (const cfg of configs) {
      const edges = cannyEdges(bil, cfg.lo, cfg.hi, cfg.dilate);
      const q = findBoardQuad(resized, edges);
      if (q && (!board || q.area > board.area * 1.03)) {
        if (edgesKept) edgesKept.delete();
        edgesKept = edges;
        board = q;
        chosenDilate = cfg.dilate;
      } else {
        edges.delete();
      }
    }
    // Dilation grows the binary edge map by ~1 pixel per iteration, so the
    // resulting quad is roughly `chosenDilate` pixels too far outward from
    // the true board boundary. Shrink the quad toward its centroid to
    // compensate — otherwise the rectified "squares" each steal 1–2 pixels
    // from the adjacent tile, which causes tile-boundary edges to look like
    // a piece to the Laplacian occupancy head (false positives on empty
    // boards in particular).
    if (board && chosenDilate > 0) {
      const cx = board.pts.reduce((a, p) => a + p.x, 0) / 4;
      const cy = board.pts.reduce((a, p) => a + p.y, 0) / 4;
      const shrink = chosenDilate + 0.5;
      board.pts = board.pts.map(p => {
        const dx = p.x - cx, dy = p.y - cy;
        const d = Math.hypot(dx, dy);
        if (d < 1e-3) return { x: p.x, y: p.y };
        return { x: p.x - (dx / d) * shrink, y: p.y - (dy / d) * shrink };
      });
    }
    bil.delete();

    if (!board) {
      if (edgesKept) edgesKept.delete();
      resized.delete();
      return { ok: false, reason: 'No board quadrilateral found', stages };
    }

    stages.resized = resized;
    stages.edges = edgesKept;
    stages.cornersResized = board.pts.map(p => ({ x: p.x, y: p.y }));
    stages.cornersOriginal = board.pts.map(p =>
      ({ x: p.x / scale, y: p.y / scale }));

    const rect = rectify(resized, board.pts);
    stages.rectified = rect;

    const classified = classifySquares(rect);
    const orient = detectOrientation(classified);
    if (orient.flip180) {
      classified.grid = rotateGrid180(classified.grid);
    }
    stages.classified = classified;
    stages.orientation = orient;

    const fen = gridToFEN(classified.grid);

    return {
      ok: true,
      fen,
      grid: classified.grid,
      thresholds: classified.thresholds,
      tiles: classified.tiles,
      orientation: orient,
      stages,
      srcSize: { w: imgElem.naturalWidth || imgElem.width,
                 h: imgElem.naturalHeight || imgElem.height },
      scale,
    };
  };

  PL.disposeStages = function (stages) {
    if (!stages) return;
    for (const k of ['resized', 'edges', 'rectified']) {
      if (stages[k] && stages[k].delete) {
        try { stages[k].delete(); } catch (e) { /* noop */ }
      }
    }
  };

  // ------------------------------------------------------------
  // Utility: render Mat into canvas.
  // ------------------------------------------------------------
  PL.showMat = function (mat, canvas) {
    cv.imshow(canvas, mat);
  };

  PL.gridToFEN = gridToFEN;

})(PL);

if (typeof window !== 'undefined') window.PL = PL;
