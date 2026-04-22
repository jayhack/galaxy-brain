/*
 * oblique-gambit — UI controller for index.html.
 *
 * Responsibilities:
 *   - Load dataset.json and render the gallery.
 *   - Wire up file-drop / file-picker for custom uploads.
 *   - Run the pipeline against the selected image and paint the visualisations.
 *   - Render the "How it works" stage graphics once the first image runs.
 *   - Run the pipeline across every dataset image and fill the "How well it
 *     works" table with live metrics (preferring precomputed results if shipped).
 */

(function () {
  'use strict';

  const PIECE_GLYPH = { W: '\u2659', B: '\u265F' }; // pawn glyphs for occupancy-only
  const dataset = { images: [] };
  let cvReady = false;
  let lastResult = null;
  let currentImgElem = null;
  const evalResults = []; // populated after "Run on dataset"

  // -----------------------------------------------------------
  // Tab switching
  // -----------------------------------------------------------
  function setTab(id) {
    document.querySelectorAll('.tabs button').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === id);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === 'tab-' + id);
    });
    if (id === 'how' && cvReady && lastResult) renderHowItWorks(lastResult, currentImgElem);
    if (id === 'perf' && cvReady) ensureEvalRun();
  }
  document.querySelectorAll('.tabs button').forEach(b =>
    b.addEventListener('click', () => setTab(b.dataset.tab)));

  // -----------------------------------------------------------
  // Setup: wait for OpenCV.js, load dataset.json
  // -----------------------------------------------------------
  function setStatus(el, text, cls) {
    el.textContent = '';
    el.className = 'status' + (cls ? ' ' + cls : '');
    if (text) {
      if (cls === 'loading') {
        const s = document.createElement('span');
        s.className = 'spinner';
        el.appendChild(s);
      }
      el.appendChild(document.createTextNode(text));
    }
  }

  const statusEl = document.getElementById('status');

  setStatus(statusEl, 'Loading OpenCV.js (~8 MB wasm)…', 'loading');
  // OpenCV.js attaches a 'cv' global once its wasm module finishes loading.
  function onOpenCvReady() {
    cvReady = true;
    setStatus(statusEl, 'OpenCV ready. Pick a dataset image or upload your own.',
      'ok');
    maybeAutoRunFirst();
  }
  // cv may already be initialised when this script runs (cache hit):
  if (typeof cv !== 'undefined' && cv && cv.Mat) {
    onOpenCvReady();
  } else if (typeof cv !== 'undefined' && cv && typeof cv.then === 'function') {
    cv.then(() => onOpenCvReady()).catch(err =>
      setStatus(statusEl, 'OpenCV failed: ' + err, 'err'));
  } else {
    // polling fallback
    const poll = setInterval(() => {
      if (typeof cv !== 'undefined' && cv && cv.Mat) {
        clearInterval(poll);
        onOpenCvReady();
      }
    }, 200);
  }
  window.Module = window.Module || {};
  // OpenCV.js calls Module.onRuntimeInitialized when its wasm binary is live.
  window.Module.onRuntimeInitialized = () => onOpenCvReady();

  async function loadDataset() {
    try {
      const r = await fetch('dataset.json');
      const j = await r.json();
      dataset.images = j.images;
      dataset.description = j.description;
      renderGallery();
      renderHowItWorksDatasetSamples();
    } catch (e) {
      setStatus(statusEl, 'Failed to load dataset.json: ' + e, 'err');
    }
  }
  loadDataset();

  async function loadPrecomputed() {
    try {
      const r = await fetch('precomputed/results.json');
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  // -----------------------------------------------------------
  // Gallery
  // -----------------------------------------------------------
  const galleryEl = document.getElementById('gallery');
  function renderGallery() {
    galleryEl.innerHTML = '';
    for (const item of dataset.images) {
      const card = document.createElement('div');
      card.className = 'item';
      card.dataset.id = item.id;
      const img = document.createElement('img');
      img.src = item.file;
      img.alt = item.id;
      img.loading = 'lazy';
      const cap = document.createElement('div');
      cap.className = 'cap';
      cap.textContent = item.id;
      card.appendChild(img);
      card.appendChild(cap);
      card.addEventListener('click', () => selectDatasetImage(item));
      galleryEl.appendChild(card);
    }
  }

  async function selectDatasetImage(item) {
    document.querySelectorAll('.gallery .item').forEach(e =>
      e.classList.toggle('selected', e.dataset.id === item.id));
    const img = await loadImage(item.file);
    runPipelineOnImage(img, item);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function maybeAutoRunFirst() {
    if (!dataset.images.length) {
      setTimeout(maybeAutoRunFirst, 150);
      return;
    }
    selectDatasetImage(dataset.images[0]);
  }

  // -----------------------------------------------------------
  // Upload / drop
  // -----------------------------------------------------------
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('dragover', e => {
    e.preventDefault(); drop.classList.add('drag');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', async e => {
    e.preventDefault();
    drop.classList.remove('drag');
    if (e.dataTransfer.files && e.dataTransfer.files[0])
      await handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', async e => {
    if (e.target.files && e.target.files[0])
      await handleFile(e.target.files[0]);
  });
  async function handleFile(file) {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    runPipelineOnImage(img, {
      id: file.name, file: url, fen: null,
      source: 'user upload', kind: 'upload',
    });
    document.querySelectorAll('.gallery .item').forEach(e =>
      e.classList.remove('selected'));
  }

  // -----------------------------------------------------------
  // Run pipeline on a single image and paint visualisations
  // -----------------------------------------------------------
  function runPipelineOnImage(img, item) {
    if (!cvReady) {
      setStatus(statusEl, 'OpenCV not ready yet…', 'loading');
      return;
    }
    currentImgElem = img;
    const t0 = performance.now();
    setStatus(statusEl, 'Running pipeline…', 'loading');
    // Defer to next frame so spinner paints.
    requestAnimationFrame(() => {
      try {
        const res = PL.run(img);
        lastResult = res;
        res.item = item;
        const dt = performance.now() - t0;
        paintResult(res, img, item, dt);
        if (document.querySelector('#tab-how').classList.contains('active'))
          renderHowItWorks(res, img);
      } catch (err) {
        console.error(err);
        setStatus(statusEl, 'Pipeline crashed: ' + err.message, 'err');
      }
    });
  }

  // -----------------------------------------------------------
  // Painters
  // -----------------------------------------------------------
  function paintResult(res, img, item, dt) {
    // preview canvas — show the original image with board overlay
    const canvas = document.getElementById('preview');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    if (res.ok) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = Math.max(3, canvas.width / 300);
      ctx.beginPath();
      const c = res.stages.cornersOriginal;
      ctx.moveTo(c[0].x, c[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(c[i].x, c[i].y);
      ctx.closePath();
      ctx.stroke();
      // corner markers
      ctx.fillStyle = '#60a5fa';
      for (const p of c) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(5, canvas.width / 180), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const rectCanvas = document.getElementById('rectified');
    if (res.ok) {
      cv.imshow(rectCanvas, res.stages.rectified);
      // draw 8x8 grid + classification marks on top
      const rctx = rectCanvas.getContext('2d');
      const size = rectCanvas.width;
      const sq = size / 8;
      rctx.strokeStyle = 'rgba(245,158,11,0.8)';
      rctx.lineWidth = 1.5;
      for (let i = 0; i <= 8; i++) {
        rctx.beginPath();
        rctx.moveTo(i * sq, 0); rctx.lineTo(i * sq, size); rctx.stroke();
        rctx.beginPath();
        rctx.moveTo(0, i * sq); rctx.lineTo(size, i * sq); rctx.stroke();
      }
      const grid = res.grid;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const cell = grid[r][f];
          if (!cell.occupied) continue;
          const cx = f * sq + sq / 2, cy = r * sq + sq / 2;
          rctx.fillStyle = cell.side === 'W'
            ? 'rgba(96,165,250,0.55)' : 'rgba(244,63,94,0.55)';
          rctx.beginPath();
          rctx.arc(cx, cy, sq * 0.22, 0, Math.PI * 2);
          rctx.fill();
        }
      }
    } else {
      const rctx = rectCanvas.getContext('2d');
      rctx.clearRect(0, 0, rectCanvas.width, rectCanvas.height);
    }

    // Chessboard diagram (predicted)
    renderBoardDiagram(document.getElementById('pred-board'),
      res.ok ? res.grid : null,
      item.occupancy || null,
      item.side || null);

    // FEN
    const fenEl = document.getElementById('fen');
    fenEl.textContent = res.ok ? res.fen : '(board not detected)';

    // Metadata
    const metaEl = document.getElementById('meta');
    const metaLines = [];
    metaLines.push(['image', item.id]);
    metaLines.push(['source', item.source || '(unknown)']);
    if (item.note) metaLines.push(['note', item.note]);
    if (item.fen) metaLines.push(['ground-truth FEN', item.fen]);
    if (res.ok) {
      metaLines.push(['flip 180°', res.orientation.flip180 ? 'yes' : 'no']);
      metaLines.push(['tile mean (light / dark)',
        `${res.tiles.light.toFixed(1)} / ${res.tiles.dark.toFixed(1)}`]);
      metaLines.push(['laplacian threshold',
        `${res.thresholds.lapThresh.toFixed(2)} ` +
        `(empty≈${res.thresholds.lowLap.toFixed(2)}, ` +
        `occ≈${res.thresholds.highLap.toFixed(2)})`]);
      metaLines.push(['pipeline runtime', `${dt.toFixed(0)} ms`]);
    } else {
      metaLines.push(['pipeline', res.reason || 'failed']);
    }
    metaEl.innerHTML = '';
    for (const [k, v] of metaLines) {
      const a = document.createElement('div'); a.textContent = k;
      const b = document.createElement('div'); b.className = ''; b.innerHTML = `<b>${escapeHTML(String(v))}</b>`;
      metaEl.appendChild(a); metaEl.appendChild(b);
    }

    // Per-image score (if ground truth available)
    if (res.ok && item.occupancy) {
      const s = scoreVsGroundTruth(res.grid, item.occupancy, item.side);
      setStatus(statusEl,
        `Pipeline OK in ${dt.toFixed(0)} ms — ` +
        `occupancy ${(s.occAcc * 100).toFixed(0)}%, ` +
        `side ${(s.sideAcc * 100).toFixed(0)}%, ` +
        `full-board ${s.exactBoard ? '✓' : '✗'}`,
        s.exactBoard ? 'ok' : '');
    } else if (res.ok) {
      setStatus(statusEl, `Pipeline OK in ${dt.toFixed(0)} ms`, 'ok');
    } else {
      setStatus(statusEl, 'Pipeline failed: ' + (res.reason || 'unknown'), 'err');
    }
  }

  function renderBoardDiagram(el, grid, gtOcc, gtSide) {
    el.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = document.createElement('div');
        sq.className = 'sq ' + (((r + f) % 2 === 0) ? 'light' : 'dark');
        if (grid) {
          const cell = grid[r][f];
          if (cell.occupied) {
            sq.textContent = PIECE_GLYPH[cell.side] || '?';
            sq.style.color = cell.side === 'W' ? '#fafafa' : '#0b0b0b';
            sq.style.textShadow = cell.side === 'W'
              ? '0 1px 1px rgba(0,0,0,0.75)' : '0 1px 1px rgba(255,255,255,0.6)';
          }
          if (gtOcc) {
            const predOcc = cell.occupied ? 1 : 0;
            if (predOcc !== gtOcc[r][f]) sq.classList.add('gt-mismatch');
            else if (gtSide && cell.occupied && cell.side !== gtSide[r][f])
              sq.classList.add('gt-mismatch');
          }
        }
        el.appendChild(sq);
      }
    }
  }

  function scoreVsGroundTruth(grid, gtOcc, gtSide) {
    let occCorrect = 0, occTotal = 64;
    let sideCorrect = 0, sideTotal = 0;
    let exact = true;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const predOcc = grid[r][f].occupied ? 1 : 0;
        if (predOcc === gtOcc[r][f]) occCorrect++;
        else exact = false;
        if (gtSide && gtOcc[r][f] === 1) {
          sideTotal++;
          if (predOcc === 1 && grid[r][f].side === gtSide[r][f]) {
            sideCorrect++;
          } else {
            exact = false;
          }
        }
      }
    }
    return {
      occAcc: occCorrect / occTotal,
      sideAcc: sideTotal ? sideCorrect / sideTotal : 1,
      exactBoard: exact,
      occCorrect, occTotal,
      sideCorrect, sideTotal,
    };
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // -----------------------------------------------------------
  // How it works tab — populate stage canvases with last result
  // -----------------------------------------------------------
  function renderHowItWorks(res, img) {
    if (!res || !res.ok) return;

    const stageInput = document.getElementById('stage-input');
    stageInput.width = img.naturalWidth || img.width;
    stageInput.height = img.naturalHeight || img.height;
    stageInput.getContext('2d').drawImage(img, 0, 0);

    const stageEdges = document.getElementById('stage-edges');
    if (res.stages.edges) cv.imshow(stageEdges, res.stages.edges);

    const stageCorners = document.getElementById('stage-corners');
    if (res.stages.resized) {
      cv.imshow(stageCorners, res.stages.resized);
      const ctx = stageCorners.getContext('2d');
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const c = res.stages.cornersResized;
      ctx.moveTo(c[0].x, c[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(c[i].x, c[i].y);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#60a5fa';
      for (const p of c) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const stageRect = document.getElementById('stage-rectified');
    if (res.stages.rectified) {
      cv.imshow(stageRect, res.stages.rectified);
      const ctx = stageRect.getContext('2d');
      const size = stageRect.width;
      const sq = size / 8;
      ctx.strokeStyle = 'rgba(245,158,11,0.7)';
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath(); ctx.moveTo(i * sq, 0); ctx.lineTo(i * sq, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * sq); ctx.lineTo(size, i * sq); ctx.stroke();
      }
    }

    // Occupancy heatmap: visualize laplacian energy per square
    const occCanvas = document.getElementById('stage-occupancy');
    occCanvas.width = 320; occCanvas.height = 320;
    const octx = occCanvas.getContext('2d');
    octx.fillStyle = '#0b0b0b';
    octx.fillRect(0, 0, 320, 320);
    let lapMax = 0;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++)
      lapMax = Math.max(lapMax, res.grid[r][f].lapE);
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = res.grid[r][f];
        const v = Math.min(1, cell.lapE / Math.max(1, lapMax));
        const hue = cell.occupied ? 25 : 210;
        octx.fillStyle = `hsl(${hue}, 75%, ${10 + v * 48}%)`;
        octx.fillRect(f * 40, r * 40, 40, 40);
        if (cell.occupied) {
          octx.fillStyle = cell.side === 'W' ? '#fafafa' : '#0b0b0b';
          octx.font = 'bold 22px ui-monospace, monospace';
          octx.textAlign = 'center'; octx.textBaseline = 'middle';
          octx.fillText(cell.side === 'W' ? '\u2659' : '\u265F',
            f * 40 + 20, r * 40 + 22);
        }
      }
    }
  }

  function renderHowItWorksDatasetSamples() {
    // Populate a small thumbnail strip in the "How it works" tab so the
    // reader can see what the input distribution looks like.
    const el = document.getElementById('how-samples');
    if (!el) return;
    el.innerHTML = '';
    for (const item of dataset.images.slice(0, 8)) {
      const a = document.createElement('div');
      a.className = 'item';
      const img = document.createElement('img');
      img.src = item.file; img.loading = 'lazy';
      a.appendChild(img);
      const c = document.createElement('div');
      c.className = 'cap'; c.textContent = item.id;
      a.appendChild(c);
      a.addEventListener('click', () => {
        setTab('demo');
        selectDatasetImage(item);
      });
      el.appendChild(a);
    }
  }

  // -----------------------------------------------------------
  // How well it works tab — run pipeline on every dataset image
  // -----------------------------------------------------------
  let evalStarted = false;
  async function ensureEvalRun() {
    if (evalStarted) return;
    evalStarted = true;

    const precomp = await loadPrecomputed();
    const tbody = document.getElementById('perf-rows');
    const aggEl = document.getElementById('perf-agg');
    const failEl = document.getElementById('perf-fails');
    tbody.innerHTML = '';
    aggEl.innerHTML = '';
    failEl.innerHTML = '';

    let boardDetected = 0;
    let sumOcc = 0, sumSide = 0, exactCount = 0;
    const fails = [];
    const runs = [];

    setStatus(document.getElementById('perf-status'),
      `Running pipeline on ${dataset.images.length} images…`, 'loading');

    for (let i = 0; i < dataset.images.length; i++) {
      const item = dataset.images[i];
      let row;
      const precompRow = precomp && precomp.images.find(p => p.id === item.id);
      if (precompRow) {
        row = precompRow;
      } else {
        const img = await loadImage(item.file);
        const t0 = performance.now();
        const res = PL.run(img);
        const dt = performance.now() - t0;
        if (!res.ok) {
          row = {
            id: item.id, ok: false, reason: res.reason, ms: dt,
            predFEN: null, occAcc: 0, sideAcc: 0, exact: false,
          };
        } else {
          const s = scoreVsGroundTruth(res.grid, item.occupancy, item.side);
          row = {
            id: item.id, ok: true, ms: dt,
            predFEN: res.fen, occAcc: s.occAcc, sideAcc: s.sideAcc,
            exact: s.exactBoard, occCorrect: s.occCorrect,
            sideCorrect: s.sideCorrect, sideTotal: s.sideTotal,
            flipped: res.orientation.flip180,
          };
          PL.disposeStages(res.stages);
        }
      }
      runs.push(row);
      if (row.ok) boardDetected++;
      sumOcc += row.occAcc;
      sumSide += row.sideAcc;
      if (row.exact) exactCount++;
      if (!row.ok || row.occAcc < 0.9 || row.sideAcc < 0.9) {
        fails.push({ item, row });
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${escapeHTML(row.id)}</code></td>
        <td>${row.ok ? '<span style="color:#10b981">✓ detected</span>' : '<span style="color:#ef4444">✗ ' + escapeHTML(row.reason || 'fail') + '</span>'}</td>
        <td class="num score ${cls(row.occAcc)}">${(row.occAcc * 100).toFixed(0)}%</td>
        <td class="num score ${cls(row.sideAcc)}">${(row.sideAcc * 100).toFixed(0)}%</td>
        <td class="num">${row.exact ? '<span style="color:#10b981">✓</span>' : '<span style="color:#ef4444">✗</span>'}</td>
        <td class="num">${row.ms ? Math.round(row.ms) + ' ms' : ''}</td>
      `;
      tbody.appendChild(tr);
      await new Promise(r => setTimeout(r, 0));
    }

    const n = runs.length;
    const bd = boardDetected / n;
    const occ = sumOcc / n;
    const side = sumSide / n;
    const exact = exactCount / n;
    aggEl.innerHTML = `
      <div class="kv">
        <div>Images in dataset</div><div><b>${n}</b></div>
        <div>Board detected (quad found)</div><div><b>${boardDetected}/${n} &nbsp;(${(bd * 100).toFixed(0)}%)</b></div>
        <div>Mean occupancy accuracy (per-square)</div><div><b>${(occ * 100).toFixed(1)}%</b></div>
        <div>Mean side accuracy (among occupied, ground-truth)</div><div><b>${(side * 100).toFixed(1)}%</b></div>
        <div>Full-board exact match (occupancy + side)</div><div><b>${exactCount}/${n} &nbsp;(${(exact * 100).toFixed(0)}%)</b></div>
      </div>
    `;

    // Failure callouts
    if (fails.length === 0) {
      failEl.innerHTML = '<p class="note">No failures on this dataset — every image is detected and scored at ≥90% occupancy and side accuracy.</p>';
    } else {
      const box = document.createElement('div');
      box.className = 'grid-auto';
      for (const { item, row } of fails.slice(0, 6)) {
        const a = document.createElement('div');
        a.className = 'card';
        a.innerHTML = `
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${escapeHTML(row.ok ? 'underperformed' : 'detection failed')}</div>
          <div style="font-weight:500;margin-bottom:6px">${escapeHTML(item.id)}</div>
          <img src="${item.file}" style="width:100%;border-radius:6px;margin-bottom:6px" />
          <div class="kv">
            <div>occupancy</div><div><b class="${cls(row.occAcc)}">${(row.occAcc * 100).toFixed(0)}%</b></div>
            <div>side</div><div><b class="${cls(row.sideAcc)}">${(row.sideAcc * 100).toFixed(0)}%</b></div>
            <div>note</div><div><b>${escapeHTML(item.note || '')}</b></div>
          </div>`;
        box.appendChild(a);
      }
      failEl.appendChild(box);
    }

    setStatus(document.getElementById('perf-status'),
      `Done — ${boardDetected}/${n} boards detected, ` +
      `occupancy ${(occ * 100).toFixed(1)}%, side ${(side * 100).toFixed(1)}%.`,
      'ok');
  }

  function cls(x) {
    if (x >= 0.97) return 'good';
    if (x >= 0.85) return 'ok';
    return 'bad';
  }

})();
