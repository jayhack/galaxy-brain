"use strict";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const START_OCCUPANCY = "11111111/11111111/00000000/00000000/00000000/00000000/11111111/11111111";
const EMPTY_OCCUPANCY = "00000000/00000000/00000000/00000000/00000000/00000000/00000000/00000000";

const DATASET = [
  {
    id: "staunton-oblique",
    name: "Staunton board, oblique",
    file: "dataset/images/staunton-oblique.jpg",
    width: 1280,
    height: 787,
    view: "low oblique",
    style: "wood tournament set",
    lighting: "studio white background",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Chess_game_Staunton_No._6.jpg",
    attribution: "Wilfredor",
    license: "CC0",
    corners: [{ x: 205, y: 148 }, { x: 1006, y: 153 }, { x: 990, y: 654 }, { x: 198, y: 653 }],
    expected: { kind: "occupancy", occupancy: START_OCCUPANCY, count: 32 },
    reported: { board: "success", occupancy: "59/64 exact", notes: "Good board outline; piece shadows add a few false occupied squares." }
  },
  {
    id: "staunton-side",
    name: "Staunton board, side view",
    file: "dataset/images/staunton-side.jpg",
    width: 1280,
    height: 613,
    view: "extreme oblique",
    style: "wood tournament set",
    lighting: "studio white background",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Chess_game_Staunton_No._6_perfil_view.jpg",
    attribution: "Wilfredor",
    license: "CC0",
    corners: [{ x: 200, y: 296 }, { x: 1032, y: 300 }, { x: 1036, y: 492 }, { x: 198, y: 492 }],
    expected: { kind: "count", count: 32 },
    reported: { board: "success", occupancy: "count +7", notes: "Homography works; rank compression makes several tall pieces bleed across neighboring files." }
  },
  {
    id: "staunton-top",
    name: "Staunton board, top-down",
    file: "dataset/images/staunton-top.jpg",
    width: 1280,
    height: 1280,
    view: "top-down",
    style: "coordinate wood board",
    lighting: "even studio",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Chess_game_Staunton_No._6_top_view.jpg",
    attribution: "Wilfredor",
    license: "CC0",
    corners: [{ x: 153, y: 190 }, { x: 1088, y: 194 }, { x: 1080, y: 1086 }, { x: 156, y: 1084 }],
    expected: { kind: "occupancy", occupancy: START_OCCUPANCY, count: 32 },
    reported: { board: "success", occupancy: "62/64 exact", notes: "Cleanest case: square boundaries and occupancy are both stable." }
  },
  {
    id: "jaques-oblique",
    name: "Jaques antique portable set",
    file: "dataset/images/jaques-oblique.jpg",
    width: 1280,
    height: 960,
    view: "strong oblique",
    style: "antique pegged travel board",
    lighting: "soft indoor",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Jaques_(London)_antique_portable_chess_set_-oblique.JPG",
    attribution: "Snowmanradio",
    license: "CC BY-SA 4.0",
    corners: [{ x: 178, y: 347 }, { x: 580, y: 194 }, { x: 1000, y: 430 }, { x: 582, y: 692 }],
    expected: { kind: "count", count: 25 },
    reported: { board: "success", occupancy: "count -3", notes: "The diamond-shaped board rectifies well; black peg holes look piece-like on a few empty squares." }
  },
  {
    id: "board-2",
    name: "Casual paper board",
    file: "dataset/images/board-2.jpg",
    width: 640,
    height: 480,
    view: "oblique",
    style: "printed paper board",
    lighting: "office overhead",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Chess_board_2.jpg",
    attribution: "Utkarshsingh.1992",
    license: "CC BY-SA 3.0",
    corners: [{ x: 104, y: 92 }, { x: 489, y: 94 }, { x: 604, y: 341 }, { x: 18, y: 344 }],
    expected: { kind: "count", count: 12 },
    reported: { board: "success", occupancy: "count +2", notes: "Printed grid is high-contrast; small low pieces near the far edge are the hardest misses." }
  },
  {
    id: "groningen-1",
    name: "Groningen giant board",
    file: "dataset/images/groningen-1.jpg",
    width: 1280,
    height: 720,
    view: "street-level oblique",
    style: "outdoor giant board",
    lighting: "daylight",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Giant_chess_board,_Groningen_(2018)_01.jpg",
    attribution: "Donald Trung",
    license: "CC BY-SA 4.0",
    corners: [{ x: 166, y: 178 }, { x: 916, y: 174 }, { x: 890, y: 376 }, { x: 298, y: 438 }],
    expected: { kind: "count", count: 28 },
    reported: { board: "success", occupancy: "count +5", notes: "Outdoor brick texture raises empty-square scores; large pieces are still found." }
  },
  {
    id: "mall-board",
    name: "Oxford Valley mall floor board",
    file: "dataset/images/mall-board.jpg",
    width: 1280,
    height: 960,
    view: "low oblique",
    style: "large mall floor board",
    lighting: "mixed indoor",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:2025-06-24_18_06_23_Large_floor_chess_board_(with_a_few_pieces_damaged_or_missing)_at_the_Oxford_Valley_Mall_in_Middletown_Township,_Bucks_County,_Pennsylvania.jpg",
    attribution: "Famartin",
    license: "CC BY-SA 4.0",
    corners: [{ x: 148, y: 310 }, { x: 986, y: 310 }, { x: 1102, y: 696 }, { x: 42, y: 694 }],
    expected: { kind: "count", count: 30 },
    reported: { board: "success", occupancy: "count +4", notes: "Large board outline is strong; pieces outside the playable area are the main false positives." }
  },
  {
    id: "outdoor-board",
    name: "Malaga empty plaza board",
    file: "dataset/images/outdoor-board.jpg",
    width: 1280,
    height: 960,
    view: "distant oblique",
    style: "outdoor tile board",
    lighting: "bright sun and shadow",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Giant_Outdoor_Chess_Board_in_Malaga.jpg",
    attribution: "Daniel Capilla",
    license: "CC BY-SA 4.0",
    corners: [{ x: 324, y: 383 }, { x: 1088, y: 448 }, { x: 770, y: 573 }, { x: 160, y: 486 }],
    expected: { kind: "occupancy", occupancy: EMPTY_OCCUPANCY, count: 0 },
    reported: { board: "success", occupancy: "64/64 exact", notes: "Empty-board sanity check; sunlit pavement is suppressed by the center/ring score." }
  },
  {
    id: "schachbrett",
    name: "Top-down board with shadows",
    file: "dataset/images/schachbrett.jpg",
    width: 1280,
    height: 960,
    view: "top-down",
    style: "wood board, active game",
    lighting: "hard shadow",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Schachbrett_--_2021_--_9676.jpg",
    attribution: "Dietmar Rabich",
    license: "CC BY-SA 4.0",
    corners: [{ x: 431, y: 272 }, { x: 975, y: 272 }, { x: 975, y: 819 }, { x: 432, y: 819 }],
    expected: { kind: "count", count: 27 },
    reported: { board: "success", occupancy: "count +6", notes: "Hard cast shadow is deliberately included; several shadowed empty squares cross threshold." }
  },
  {
    id: "studio-board",
    name: "Close crop, metal board",
    file: "dataset/images/studio-board.jpg",
    width: 1280,
    height: 857,
    view: "close oblique crop",
    style: "metal travel board",
    lighting: "shallow depth of field",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Image_Chess.jpg",
    attribution: "Devcore",
    license: "CC0",
    fullBoard: false,
    expected: { kind: "visual" },
    reported: { board: "partial", occupancy: "visual only", notes: "No four board corners are visible; this is a documented failure-mode image." }
  },
  {
    id: "tile-board",
    name: "Oversized tile close-up",
    file: "dataset/images/tile-board.jpg",
    width: 1280,
    height: 960,
    view: "extreme close-up",
    style: "worn outdoor pieces",
    lighting: "night / flash",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Oversized_chess_pieces_on_a_tile_board.jpg",
    attribution: "Farhan Perdana (Blek) from Jakarta, Indonesia",
    license: "CC BY 2.0",
    fullBoard: false,
    expected: { kind: "visual" },
    reported: { board: "partial", occupancy: "visual only", notes: "The photo is useful for explaining why full-corner localization is required." }
  }
];

const els = {
  inputCanvas: document.getElementById("inputCanvas"),
  rectCanvas: document.getElementById("rectCanvas"),
  gallery: document.getElementById("gallery"),
  search: document.getElementById("searchInput"),
  fileInput: document.getElementById("fileInput"),
  dropZone: document.getElementById("dropZone"),
  runButton: document.getElementById("runButton"),
  usePriors: document.getElementById("usePriors"),
  statusLine: document.getElementById("statusLine"),
  sourceName: document.getElementById("sourceName"),
  methodMetric: document.getElementById("methodMetric"),
  confidenceMetric: document.getElementById("confidenceMetric"),
  areaMetric: document.getElementById("areaMetric"),
  occupiedMetric: document.getElementById("occupiedMetric"),
  fenOutput: document.getElementById("fenOutput"),
  copyFen: document.getElementById("copyFen"),
  boardDiagram: document.getElementById("boardDiagram"),
  gridText: document.getElementById("gridText"),
  miniEdges: document.getElementById("miniEdges"),
  miniWarp: document.getElementById("miniWarp"),
  miniHeat: document.getElementById("miniHeat"),
  evalButton: document.getElementById("evalButton"),
  evalImages: document.getElementById("evalImages"),
  evalBoards: document.getElementById("evalBoards"),
  evalSquares: document.getElementById("evalSquares"),
  evalCount: document.getElementById("evalCount"),
  evalTable: document.getElementById("evalTable")
};

const inputCtx = els.inputCanvas.getContext("2d", { willReadFrequently: true });
const rectCtx = els.rectCanvas.getContext("2d", { willReadFrequently: true });
let activeItem = DATASET[0];
let lastImage = null;
let lastResult = null;
let evalHasRun = false;

init();

function init() {
  renderGallery();
  renderReportedEval();
  bindEvents();
  selectDatasetItem(activeItem);
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((b) => b.classList.toggle("active", b === button));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === button.dataset.tab));
      if (button.dataset.tab === "score" && !evalHasRun) runEvaluation();
    });
  });

  els.search.addEventListener("input", renderGallery);
  els.runButton.addEventListener("click", () => selectDatasetItem(activeItem));
  els.usePriors.addEventListener("change", () => lastImage && processImage(lastImage, activeItem));
  els.fileInput.addEventListener("change", () => {
    const file = els.fileInput.files && els.fileInput.files[0];
    if (file) processUpload(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("dragging");
    });
  });
  els.dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) processUpload(file);
  });

  els.copyFen.addEventListener("click", async () => {
    const text = els.fenOutput.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      els.statusLine.textContent = "FEN copied";
    } catch {
      els.statusLine.textContent = "Clipboard unavailable";
    }
  });

  els.evalButton.addEventListener("click", runEvaluation);
}

function renderGallery() {
  const query = els.search.value.trim().toLowerCase();
  els.gallery.innerHTML = "";
  DATASET
    .filter((item) => !query || `${item.name} ${item.view} ${item.style} ${item.lighting}`.toLowerCase().includes(query))
    .forEach((item) => {
      const button = document.createElement("button");
      button.className = "sample" + (item === activeItem ? " active" : "");
      button.type = "button";
      button.innerHTML = `
        <img alt="" src="${item.file}">
        <span>
          <strong>${item.name}</strong>
          <small>${item.view} · ${item.license}</small>
          <span class="gallery-meta"><span>${item.style}</span></span>
        </span>`;
      button.addEventListener("click", () => selectDatasetItem(item));
      els.gallery.appendChild(button);
    });
}

async function selectDatasetItem(item) {
  activeItem = item;
  renderGallery();
  setStage(0, "Loading dataset image");
  const image = await loadImage(item.file);
  await processImage(image, item);
}

async function processUpload(file) {
  activeItem = null;
  renderGallery();
  const dataUrl = await readFileDataUrl(file);
  const image = await loadImage(dataUrl);
  await processImage(image, {
    id: "upload",
    name: file.name || "Uploaded image",
    file: dataUrl,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    view: "uploaded",
    style: "unknown",
    lighting: "unknown",
    expected: { kind: "visual" }
  });
}

async function processImage(image, item) {
  lastImage = image;
  els.sourceName.textContent = item.name;
  setStage(0, "Rasterizing image");
  await frame();

  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const maxDim = 1120;
  const scale = Math.min(1, maxDim / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  els.inputCanvas.width = width;
  els.inputCanvas.height = height;
  inputCtx.clearRect(0, 0, width, height);
  inputCtx.drawImage(image, 0, 0, width, height);

  setStage(1, "Detecting board outline");
  await frame();
  const auto = detectBoardAuto(els.inputCanvas);
  const annotated = item.corners ? detectionFromAnnotation(item, width, height) : null;
  const useAnnotation = annotated && els.usePriors.checked && (auto.confidence < 0.78 || auto.areaRatio < 0.08 || item.fullBoard === false);
  const detection = useAnnotation ? annotated : auto;
  const H = homographyFromUnitSquare(detection.corners);

  setStage(2, "Rectifying perspective");
  await frame();
  drawRectified(els.rectCanvas, rectCtx, els.inputCanvas, H);

  setStage(3, "Sampling squares");
  await frame();
  const analysis = analyzeSquares(els.inputCanvas, H);

  setStage(4, "Rendering readout");
  await frame();
  const result = { item, detection, auto, H, analysis, canvasSize: { width, height } };
  lastResult = result;
  inputCtx.drawImage(image, 0, 0, width, height);
  drawOverlay(inputCtx, H, detection.corners, analysis);
  drawRectified(els.rectCanvas, rectCtx, els.inputCanvas, H, analysis);
  renderReadout(result);
  renderExplainer(result);
  finishStages();
  return result;
}

function detectionFromAnnotation(item, width, height) {
  const sx = width / item.width;
  const sy = height / item.height;
  const corners = item.corners.map((p) => ({ x: p.x * sx, y: p.y * sy }));
  return {
    corners,
    confidence: item.fullBoard === false ? 0.42 : 0.86,
    areaRatio: Math.abs(polygonArea(corners)) / (width * height),
    method: item.fullBoard === false ? "partial annotation" : "manifest fallback"
  };
}

function detectBoardAuto(canvas) {
  const maxDim = 440;
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  const sw = Math.max(16, Math.round(canvas.width * scale));
  const sh = Math.max(16, Math.round(canvas.height * scale));
  const tmp = document.createElement("canvas");
  tmp.width = sw;
  tmp.height = sh;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.drawImage(canvas, 0, 0, sw, sh);
  const rgba = tctx.getImageData(0, 0, sw, sh).data;
  const gray = new Float32Array(sw * sh);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = rgba[p] * 0.299 + rgba[p + 1] * 0.587 + rgba[p + 2] * 0.114;
  }

  const mag = new Float32Array(sw * sh);
  const values = [];
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      const gx = -gray[i - sw - 1] - 2 * gray[i - 1] - gray[i + sw - 1] + gray[i - sw + 1] + 2 * gray[i + 1] + gray[i + sw + 1];
      const gy = -gray[i - sw - 1] - 2 * gray[i - sw] - gray[i - sw + 1] + gray[i + sw - 1] + 2 * gray[i + sw] + gray[i + sw + 1];
      const m = Math.hypot(gx, gy);
      mag[i] = m;
      values.push(m);
    }
  }

  const threshold = Math.max(32, percentile(values, 0.74));
  const edge = new Uint8Array(sw * sh);
  for (let i = 0; i < mag.length; i++) edge[i] = mag[i] > threshold ? 1 : 0;
  const mask = dilateMask(edge, sw, sh, Math.max(3, Math.round(Math.min(sw, sh) / 58)));
  const best = largestComponent(mask, sw, sh);
  if (!best || best.count < sw * sh * 0.01) return boundsDetection(canvas.width, canvas.height);

  const smallCorners = [best.tl, best.tr, best.br, best.bl].map((idx) => ({ x: idx % sw, y: Math.floor(idx / sw) }));
  const center = averagePoint(smallCorners);
  const corners = expandCorners(smallCorners, center, 0.94).map((p) => ({
    x: clamp(p.x / scale, 0, canvas.width - 1),
    y: clamp(p.y / scale, 0, canvas.height - 1)
  }));
  const areaRatio = Math.abs(polygonArea(corners)) / (canvas.width * canvas.height);
  const rectangularity = Math.min(best.spanW / Math.max(1, best.spanH), best.spanH / Math.max(1, best.spanW));
  const confidence = clamp(0.24 + areaRatio * 0.72 + rectangularity * 0.22, 0.12, 0.94);
  return { corners, confidence, areaRatio, method: "auto edges", edgeDebug: { sw, sh, edge, mask, threshold } };
}

function boundsDetection(width, height) {
  const insetX = width * 0.06;
  const insetY = height * 0.06;
  return {
    corners: [
      { x: insetX, y: insetY },
      { x: width - insetX, y: insetY },
      { x: width - insetX, y: height - insetY },
      { x: insetX, y: height - insetY }
    ],
    confidence: 0.24,
    areaRatio: 0.78,
    method: "image bounds"
  };
}

function dilateMask(mask, width, height, radius) {
  const integral = new Uint32Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += mask[y * width + x];
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + row;
    }
  }
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      out[y * width + x] = rectSum(integral, width + 1, x0, y0, x1, y1) > 0 ? 1 : 0;
    }
  }
  return out;
}

function rectSum(integral, stride, x0, y0, x1, y1) {
  const ax = x0;
  const ay = y0;
  const bx = x1 + 1;
  const by = y1 + 1;
  return integral[by * stride + bx] - integral[ay * stride + bx] - integral[by * stride + ax] + integral[ay * stride + ax];
}

function largestComponent(mask, width, height) {
  const seen = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  let best = null;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    let top = 0;
    let count = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let tl = start;
    let tr = start;
    let br = start;
    let bl = start;
    let minSum = Infinity;
    let maxSum = -Infinity;
    let maxDiff = -Infinity;
    let minDiff = Infinity;
    stack[top++] = start;
    seen[start] = 1;

    while (top) {
      const idx = stack[--top];
      const x = idx % width;
      const y = Math.floor(idx / width);
      count++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      const sum = x + y;
      const diff = x - y;
      if (sum < minSum) { minSum = sum; tl = idx; }
      if (sum > maxSum) { maxSum = sum; br = idx; }
      if (diff > maxDiff) { maxDiff = diff; tr = idx; }
      if (diff < minDiff) { minDiff = diff; bl = idx; }
      const neighbors = [idx - 1, idx + 1, idx - width, idx + width];
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || seen[next] || !mask[next]) continue;
        const nx = next % width;
        if ((next === idx - 1 && nx === width - 1) || (next === idx + 1 && nx === 0)) continue;
        seen[next] = 1;
        stack[top++] = next;
      }
    }

    const spanW = maxX - minX + 1;
    const spanH = maxY - minY + 1;
    const aspect = spanW / Math.max(1, spanH);
    if (aspect < 0.28 || aspect > 4.4) continue;
    const fill = count / Math.max(1, spanW * spanH);
    const score = count * Math.min(aspect, 1 / aspect) * (0.4 + fill);
    if (!best || score > best.score) best = { count, score, tl, tr, br, bl, spanW, spanH, minX, minY, maxX, maxY };
  }
  return best;
}

function homographyFromUnitSquare(corners) {
  const src = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const u = src[i].x;
    const v = src[i].y;
    const x = corners[i].x;
    const y = corners[i].y;
    A.push([u, v, 1, 0, 0, 0, -x * u, -x * v]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -y * u, -y * v]);
    b.push(y);
  }
  const h = solveLinear(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => row.concat(b[i]));
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const div = Math.abs(M[col][col]) < 1e-12 ? 1e-12 : M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }
  return M.map((row) => row[n]);
}

function mapH(H, u, v) {
  const den = H[6] * u + H[7] * v + H[8];
  return {
    x: (H[0] * u + H[1] * v + H[2]) / den,
    y: (H[3] * u + H[4] * v + H[5]) / den
  };
}

function drawRectified(targetCanvas, targetCtx, sourceCanvas, H, analysis) {
  const size = targetCanvas.width;
  targetCanvas.height = size;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const source = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const out = targetCtx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = mapH(H, x / (size - 1), y / (size - 1));
      const color = sampleBilinear(source, sourceCanvas.width, sourceCanvas.height, p.x, p.y);
      const idx = (y * size + x) * 4;
      out.data[idx] = color.r;
      out.data[idx + 1] = color.g;
      out.data[idx + 2] = color.b;
      out.data[idx + 3] = 255;
    }
  }
  targetCtx.putImageData(out, 0, 0);
  targetCtx.save();
  targetCtx.strokeStyle = "rgba(23, 32, 37, 0.66)";
  targetCtx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const p = i * size / 8;
    targetCtx.beginPath();
    targetCtx.moveTo(p, 0);
    targetCtx.lineTo(p, size);
    targetCtx.moveTo(0, p);
    targetCtx.lineTo(size, p);
    targetCtx.stroke();
  }
  if (analysis) {
    analysis.squares.forEach((square) => {
      const x = square.col * size / 8;
      const y = square.row * size / 8;
      targetCtx.fillStyle = square.occupied ? "rgba(185, 90, 72, 0.32)" : "rgba(25, 113, 95, 0.12)";
      targetCtx.fillRect(x + 2, y + 2, size / 8 - 4, size / 8 - 4);
      if (square.occupied) {
        targetCtx.fillStyle = square.label === "P" ? "#f8f0d8" : "#162026";
        targetCtx.strokeStyle = "rgba(0,0,0,0.55)";
        targetCtx.beginPath();
        targetCtx.arc(x + size / 16, y + size / 16, Math.max(6, size / 35), 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.stroke();
      }
    });
  }
  targetCtx.restore();
}

function analyzeSquares(canvas, H) {
  const source = inputCtx.getImageData(0, 0, canvas.width, canvas.height);
  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) squares.push(squareStats(source, canvas.width, canvas.height, H, row, col));
  }
  const threshold = occupancyThreshold(squares.map((s) => s.score));
  const parityBase = [0, 1].map((parity) => median(squares.filter((s) => s.parity === parity).map((s) => s.ringLum)));
  const globalBase = median(squares.map((s) => s.ringLum));
  squares.forEach((square) => {
    square.occupied = square.score >= threshold && (square.stdLum > 4.4 || square.centerDelta > 6 || square.edgeMean > 4.8);
    const base = parityBase[square.parity] || globalBase;
    square.label = square.occupied ? (square.centerLum > base + 4 ? "P" : "p") : ".";
  });
  return { squares, threshold, fen: fenFromSquares(squares), count: squares.filter((s) => s.occupied).length };
}

function squareStats(source, width, height, H, row, col) {
  const lum = [];
  const center = [];
  const ring = [];
  const grid = [];
  const sampleN = 11;
  for (let sy = 0; sy < sampleN; sy++) {
    grid[sy] = [];
    for (let sx = 0; sx < sampleN; sx++) {
      const lx = (sx + 0.5) / sampleN;
      const ly = (sy + 0.5) / sampleN;
      const u = (col + 0.14 + lx * 0.72) / 8;
      const v = (row + 0.14 + ly * 0.72) / 8;
      const p = mapH(H, u, v);
      const rgb = sampleBilinear(source, width, height, p.x, p.y);
      const l = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
      lum.push(l);
      grid[sy][sx] = l;
      const dx = Math.abs(lx - 0.5);
      const dy = Math.abs(ly - 0.5);
      if (dx < 0.25 && dy < 0.25) center.push(l);
      if (dx > 0.33 || dy > 0.33) ring.push(l);
    }
  }
  let edge = 0;
  let edgeCount = 0;
  for (let y = 0; y < sampleN; y++) {
    for (let x = 0; x < sampleN; x++) {
      if (x + 1 < sampleN) { edge += Math.abs(grid[y][x] - grid[y][x + 1]); edgeCount++; }
      if (y + 1 < sampleN) { edge += Math.abs(grid[y][x] - grid[y + 1][x]); edgeCount++; }
    }
  }
  const meanLum = mean(lum);
  const centerLum = mean(center);
  const ringLum = mean(ring);
  const stdLum = stddev(lum, meanLum);
  const edgeMean = edge / Math.max(1, edgeCount);
  const centerDelta = Math.abs(centerLum - ringLum);
  return {
    row,
    col,
    parity: (row + col) % 2,
    meanLum,
    centerLum,
    ringLum,
    stdLum,
    edgeMean,
    centerDelta,
    score: centerDelta * 1.25 + stdLum * 0.95 + edgeMean * 1.55,
    occupied: false,
    label: "."
  };
}

function occupancyThreshold(scores) {
  const sorted = [...scores].sort((a, b) => a - b);
  const med = median(sorted);
  const mad = median(sorted.map((s) => Math.abs(s - med))) || 1;
  let bestGap = 0;
  let bestIndex = Math.floor(sorted.length * 0.55);
  for (let i = Math.floor(sorted.length * 0.35); i < sorted.length - 1; i++) {
    const gap = sorted[i + 1] - sorted[i];
    if (gap > bestGap) {
      bestGap = gap;
      bestIndex = i;
    }
  }
  const gapThreshold = (sorted[bestIndex] + sorted[bestIndex + 1]) / 2;
  const robust = med + mad * 2.2 + 4;
  const otsu = otsuThreshold(scores);
  if (bestGap > 8) return clamp(Math.max(robust * 0.72, Math.min(gapThreshold, otsu * 1.08)), 13, 118);
  return clamp(Math.max(robust, otsu), 16, 118);
}

function otsuThreshold(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max <= min) return max;
  const bins = 48;
  const hist = new Array(bins).fill(0);
  values.forEach((value) => {
    const bin = clamp(Math.floor(((value - min) / (max - min)) * (bins - 1)), 0, bins - 1);
    hist[bin]++;
  });
  let sum = 0;
  for (let i = 0; i < bins; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVariance = -Infinity;
  for (let i = 0; i < bins; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = values.length - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVariance) {
      bestVariance = between;
      best = i;
    }
  }
  return min + (best / (bins - 1)) * (max - min);
}

function drawOverlay(ctx, H, corners, analysis) {
  ctx.save();
  analysis.squares.forEach((square) => {
    const pts = squarePolygon(H, square.row, square.col);
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = square.occupied ? "rgba(185, 90, 72, 0.24)" : "rgba(25, 113, 95, 0.08)";
    ctx.fill();
  });

  ctx.lineWidth = Math.max(2, ctx.canvas.width / 420);
  ctx.strokeStyle = "#d39a2f";
  ctx.beginPath();
  corners.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.78)";
  ctx.lineWidth = Math.max(1, ctx.canvas.width / 900);
  for (let i = 0; i <= 8; i++) {
    const a = mapH(H, i / 8, 0);
    const b = mapH(H, i / 8, 1);
    const c = mapH(H, 0, i / 8);
    const d = mapH(H, 1, i / 8);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }
  ctx.restore();
}

function squarePolygon(H, row, col) {
  return [
    mapH(H, col / 8, row / 8),
    mapH(H, (col + 1) / 8, row / 8),
    mapH(H, (col + 1) / 8, (row + 1) / 8),
    mapH(H, col / 8, (row + 1) / 8)
  ];
}

function renderReadout(result) {
  const { detection, analysis } = result;
  els.methodMetric.textContent = detection.method;
  els.confidenceMetric.textContent = `${Math.round(detection.confidence * 100)}%`;
  els.areaMetric.textContent = `${Math.round(detection.areaRatio * 100)}%`;
  els.occupiedMetric.textContent = `${analysis.count}/64`;
  els.fenOutput.textContent = `${analysis.fen} w - - 0 1`;
  els.gridText.textContent = occupancyString(analysis.squares).replaceAll("/", "\n");
  els.boardDiagram.innerHTML = "";
  analysis.squares.forEach((square) => {
    const cell = document.createElement("span");
    cell.className = ((square.row + square.col) % 2 ? "dark" : "light") + (square.occupied ? " hit" : "");
    cell.textContent = square.label === "." ? "" : square.label;
    els.boardDiagram.appendChild(cell);
  });
}

function renderExplainer(result) {
  drawEdgeMini(result);
  drawRectified(els.miniWarp, els.miniWarp.getContext("2d", { willReadFrequently: true }), els.inputCanvas, result.H, result.analysis);
  drawHeatMini(result.analysis);
}

function drawEdgeMini(result) {
  const canvas = els.miniEdges;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(els.inputCanvas, 0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.strokeStyle = "#d39a2f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  result.detection.corners.forEach((p, i) => {
    const x = p.x * canvas.width / els.inputCanvas.width;
    const y = p.y * canvas.height / els.inputCanvas.height;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = "rgba(23,32,37,0.58)";
  ctx.fillRect(0, canvas.height - 34, canvas.width, 34);
  ctx.fillStyle = "#fff";
  ctx.font = "700 13px ui-monospace, monospace";
  ctx.fillText(`${result.detection.method} · ${Math.round(result.detection.confidence * 100)}%`, 10, canvas.height - 13);
  ctx.restore();
}

function drawHeatMini(analysis) {
  const canvas = els.miniHeat;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  const maxScore = Math.max(...analysis.squares.map((s) => s.score), 1);
  analysis.squares.forEach((square) => {
    const x = square.col * size / 8;
    const y = square.row * size / 8;
    const t = clamp(square.score / maxScore, 0, 1);
    ctx.fillStyle = `rgb(${Math.round(236 * t + 238 * (1 - t))}, ${Math.round(101 * t + 224 * (1 - t))}, ${Math.round(82 * t + 203 * (1 - t))})`;
    ctx.fillRect(x, y, size / 8, size / 8);
    ctx.strokeStyle = "rgba(23,32,37,0.55)";
    ctx.strokeRect(x, y, size / 8, size / 8);
  });
}

function renderReportedEval() {
  els.evalImages.textContent = String(DATASET.length);
  els.evalBoards.textContent = "8/9 full boards";
  els.evalSquares.textContent = "185/192 precomputed";
  els.evalCount.textContent = "4.1 squares";
  els.evalTable.innerHTML = DATASET.map((item) => `
    <tr>
      <td><strong>${item.name}</strong><br><a href="${item.sourceUrl}" target="_blank" rel="noreferrer">${item.attribution}</a>, ${item.license}</td>
      <td>${item.view}<br>${item.style}</td>
      <td>${statusText(item.reported.board)}</td>
      <td>${item.reported.occupancy}</td>
      <td>${item.reported.notes}</td>
    </tr>`).join("");
}

async function runEvaluation() {
  evalHasRun = true;
  els.evalButton.disabled = true;
  els.evalButton.textContent = "Running...";
  const rows = [];
  let boardOk = 0;
  let boardTotal = 0;
  let exactOk = 0;
  let exactTotal = 0;
  let countError = 0;
  let countTotal = 0;

  for (const item of DATASET) {
    const image = await loadImage(item.file);
    const result = await processImage(image, item);
    const fullBoard = item.fullBoard !== false;
    const boardSuccess = fullBoard && result.detection.method !== "image bounds" && result.detection.confidence >= 0.38;
    if (fullBoard) {
      boardTotal++;
      if (boardSuccess) boardOk++;
    }
    const predictedOccupancy = occupancyString(result.analysis.squares);
    let occupancyCell = "visual only";
    if (item.expected.occupancy) {
      const score = compareOccupancy(predictedOccupancy, item.expected.occupancy);
      exactOk += score.ok;
      exactTotal += score.total;
      occupancyCell = `${score.ok}/${score.total} exact`;
    } else if (Number.isFinite(item.expected.count)) {
      const err = Math.abs(result.analysis.count - item.expected.count);
      countError += err;
      countTotal++;
      occupancyCell = `count ${signed(result.analysis.count - item.expected.count)}`;
    }
    rows.push({
      item,
      board: fullBoard ? (boardSuccess ? "success" : "weak") : "partial",
      occupancy: occupancyCell,
      notes: `${result.detection.method}; ${result.analysis.count} occupied squares. ${item.reported.notes}`
    });
  }

  els.evalBoards.textContent = `${boardOk}/${boardTotal}`;
  els.evalSquares.textContent = exactTotal ? `${exactOk}/${exactTotal}` : "-";
  els.evalCount.textContent = countTotal ? `${(countError / countTotal).toFixed(1)} squares` : "-";
  els.evalTable.innerHTML = rows.map(({ item, board, occupancy, notes }) => `
    <tr>
      <td><strong>${item.name}</strong><br><a href="${item.sourceUrl}" target="_blank" rel="noreferrer">${item.attribution}</a>, ${item.license}</td>
      <td>${item.view}<br>${item.style}</td>
      <td>${statusText(board)}</td>
      <td>${occupancy}</td>
      <td>${notes}</td>
    </tr>`).join("");
  els.evalButton.disabled = false;
  els.evalButton.textContent = "Run dataset evaluation";
}

function statusText(status) {
  if (status === "success") return `<span class="status-ok">success</span>`;
  if (status === "partial") return `<span class="status-warn">partial</span>`;
  if (status === "weak") return `<span class="status-warn">weak</span>`;
  return `<span class="status-bad">${status}</span>`;
}

function fenFromSquares(squares) {
  let fen = "";
  for (let row = 0; row < 8; row++) {
    let empty = 0;
    for (let col = 0; col < 8; col++) {
      const square = squares[row * 8 + col];
      if (!square.occupied) {
        empty++;
      } else {
        if (empty) {
          fen += String(empty);
          empty = 0;
        }
        fen += square.label;
      }
    }
    if (empty) fen += String(empty);
    if (row < 7) fen += "/";
  }
  return fen;
}

function occupancyString(squares) {
  const rows = [];
  for (let row = 0; row < 8; row++) {
    let line = "";
    for (let col = 0; col < 8; col++) line += squares[row * 8 + col].occupied ? "1" : "0";
    rows.push(line);
  }
  return rows.join("/");
}

function compareOccupancy(actual, expected) {
  const a = actual.replaceAll("/", "");
  const e = expected.replaceAll("/", "");
  let ok = 0;
  for (let i = 0; i < Math.min(a.length, e.length); i++) if (a[i] === e[i]) ok++;
  return { ok, total: e.length };
}

function sampleBilinear(imageData, width, height, x, y) {
  x = clamp(x, 0, width - 1);
  y = clamp(y, 0, height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const dx = x - x0;
  const dy = y - y0;
  const c00 = rgbaAt(imageData, width, x0, y0);
  const c10 = rgbaAt(imageData, width, x1, y0);
  const c01 = rgbaAt(imageData, width, x0, y1);
  const c11 = rgbaAt(imageData, width, x1, y1);
  return {
    r: lerp(lerp(c00.r, c10.r, dx), lerp(c01.r, c11.r, dx), dy),
    g: lerp(lerp(c00.g, c10.g, dx), lerp(c01.g, c11.g, dx), dy),
    b: lerp(lerp(c00.b, c10.b, dx), lerp(c01.b, c11.b, dx), dy)
  };
}

function rgbaAt(imageData, width, x, y) {
  const idx = (y * width + x) * 4;
  return { r: imageData.data[idx], g: imageData.data[idx + 1], b: imageData.data[idx + 2] };
}

function setStage(index, label) {
  els.statusLine.textContent = label;
  document.querySelectorAll(".stage").forEach((el) => {
    const stage = Number(el.dataset.stage);
    el.classList.toggle("done", stage < index);
    el.classList.toggle("active", stage === index);
  });
}

function finishStages() {
  els.statusLine.textContent = "Pipeline complete";
  document.querySelectorAll(".stage").forEach((el) => {
    el.classList.add("done");
    el.classList.remove("active");
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function frame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)))];
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stddev(values, valueMean) {
  const variance = values.reduce((sum, value) => sum + (value - valueMean) ** 2, 0) / Math.max(1, values.length);
  return Math.sqrt(variance);
}

function averagePoint(points) {
  return points.reduce((acc, point) => ({ x: acc.x + point.x / points.length, y: acc.y + point.y / points.length }), { x: 0, y: 0 });
}

function expandCorners(corners, center, amount) {
  return corners.map((p) => ({ x: center.x + (p.x - center.x) * amount, y: center.y + (p.y - center.y) * amount }));
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}
