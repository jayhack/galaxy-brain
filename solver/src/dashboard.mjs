/** The single-page dashboard, served inline (no build step, no extra deps). */
export function dashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>galaxy-brain solver</title>
<style>
  :root {
    --bg: #0b0d12; --panel: #12151c; --panel-2: #171b24; --border: #232936;
    --text: #e6e9ef; --muted: #8b94a7; --accent: #7c9cff; --accent-2: #57d6a8;
    --warn: #f2c14e; --err: #ff6b6b; --cmd: #9aa7c7;
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--sans); }
  header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 15px; margin: 0; font-weight: 600; letter-spacing: .2px; }
  header .sub { color: var(--muted); font-size: 12px; }
  .badges { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
  .badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); }
  .badge.ok { color: var(--accent-2); border-color: #244e40; background: #0f1f1a; }
  .badge.no { color: var(--err); border-color: #4e2424; background: #1f0f0f; }
  main { display: grid; grid-template-columns: 340px 1fr; gap: 0; height: calc(100vh - 53px); }
  .config { padding: 18px; border-right: 1px solid var(--border); overflow-y: auto; }
  .config label { display: block; font-size: 12px; color: var(--muted); margin: 14px 0 5px; }
  .config select, .config input[type=text], .config input[type=number] {
    width: 100%; background: var(--panel); border: 1px solid var(--border); color: var(--text);
    padding: 8px 10px; border-radius: 8px; font-size: 13px; font-family: var(--sans);
  }
  .row { display: flex; gap: 10px; }
  .row > div { flex: 1; }
  .checks { margin-top: 14px; display: grid; gap: 8px; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text); }
  .check input { width: 16px; height: 16px; accent-color: var(--accent); }
  .hint { font-size: 11px; color: var(--muted); margin-top: 3px; }
  button.run { margin-top: 18px; width: 100%; padding: 11px; border-radius: 9px; border: 0; cursor: pointer;
    background: var(--accent); color: #0b0d12; font-weight: 700; font-size: 14px; }
  button.run:disabled { opacity: .5; cursor: not-allowed; }
  .stage { display: flex; flex-direction: column; min-width: 0; }
  .steps { display: flex; gap: 6px; padding: 12px 18px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
  .step { font-size: 11px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); }
  .step.active { color: #0b0d12; background: var(--accent); border-color: var(--accent); font-weight: 700; }
  .step.done { color: var(--accent-2); border-color: #244e40; }
  .console { flex: 1; overflow-y: auto; padding: 14px 18px; font-family: var(--mono); font-size: 12.5px;
    line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .console .l-step { color: var(--accent); font-weight: 700; display: block; margin-top: 10px; }
  .console .l-cmd { color: var(--cmd); display: block; }
  .console .l-info { color: var(--text); }
  .console .l-plan { color: var(--muted); }
  .console .l-stderr { color: #ffb3a7; }
  .console .l-warn { color: var(--warn); }
  .console .l-error { color: var(--err); font-weight: 700; }
  .result { border-top: 1px solid var(--border); padding: 14px 18px; background: var(--panel); font-size: 13px; }
  .result a { color: var(--accent); }
  .result.hidden { display: none; }
  .empty { color: var(--muted); }
  code { background: var(--panel-2); padding: 1px 5px; border-radius: 5px; font-family: var(--mono); }
</style>
</head>
<body>
<header>
  <h1>galaxy-brain <span class="sub">/ solver</span></h1>
  <span class="sub">run a coding agent in a Daytona sandbox</span>
  <div class="badges" id="badges"></div>
</header>
<main>
  <form class="config" id="form">
    <label for="eval">Eval</label>
    <select id="eval" name="eval"></select>

    <label for="harness">Harness</label>
    <select id="harness" name="harness"></select>

    <label for="model">Model</label>
    <input type="text" id="model" name="model" placeholder="(harness default)" />
    <div class="hint" id="model-hint"></div>

    <label for="timeout">Agent timeout (seconds)</label>
    <input type="number" id="timeout" name="timeout" value="3600" min="60" />

    <div class="checks">
      <label class="check"><input type="checkbox" id="dryRun" checked /> Dry run (no sandbox, no cost)</label>
      <label class="check"><input type="checkbox" id="push" checked /> Push branch</label>
      <label class="check"><input type="checkbox" id="openPr" checked /> Open pull request</label>
      <label class="check"><input type="checkbox" id="draft" checked /> PR as draft</label>
      <label class="check"><input type="checkbox" id="keepSandbox" /> Keep sandbox after</label>
    </div>

    <button class="run" id="runBtn" type="submit">Run</button>
  </form>

  <section class="stage">
    <div class="steps" id="steps"></div>
    <div class="console" id="console"><span class="empty">Configure a run on the left and press Run. Output streams here live.</span></div>
    <div class="result hidden" id="result"></div>
  </section>
</main>
<script>
const PHASES = [
  ["sandbox","sandbox"],["install","install"],["clone","clone"],
  ["agent","agent"],["validate","validate"],["push","push"],["pr","PR"]
];
const $ = (id) => document.getElementById(id);
let cfg = null, es = null, running = false;

function renderSteps(active) {
  const el = $("steps"); el.innerHTML = "";
  let activeIdx = PHASES.findIndex(([p]) => p === active);
  PHASES.forEach(([phase,label], i) => {
    const s = document.createElement("span");
    s.className = "step" + (phase === active ? " active" : (activeIdx > -1 && i < activeIdx ? " done" : ""));
    s.textContent = label;
    el.appendChild(s);
  });
}

function append(cls, text) {
  const c = $("console");
  if (c.querySelector(".empty")) c.innerHTML = "";
  const span = document.createElement("span");
  span.className = cls;
  span.textContent = text;
  c.appendChild(span);
  c.scrollTop = c.scrollHeight;
}

function handleEvent(ev) {
  const { type, payload } = ev;
  switch (type) {
    case "step": append("l-step", "\\n\\u25B8 " + payload + "\\n"); break;
    case "cmd": append("l-cmd", "\\n$ " + payload + "\\n"); break;
    case "stdout": append("l-info", payload); break;
    case "stderr": append("l-stderr", payload); break;
    case "info": append("l-info", payload + "\\n"); break;
    case "plan": append("l-plan", payload); break;
    case "warn": append("l-warn", "Warning: " + payload + "\\n"); break;
    case "error": append("l-error", "Error: " + payload + "\\n"); break;
    case "status": if (payload && payload.phase) renderSteps(payload.phase); break;
    case "result": showResult(payload); break;
    case "done": finish(payload); break;
  }
}

function showResult(r) {
  const el = $("result"); el.classList.remove("hidden");
  if (r.dryRun) {
    el.innerHTML = "<b>Dry run complete.</b> No sandbox was created. Solution slug would be <code>" +
      r.eval + "/" + r.solutionSlug + "</code> on branch <code>" + r.branch + "</code>.";
    return;
  }
  let html = "<b>Result</b><br/>";
  if (r.eval) html += "Solution: <code>" + r.eval + "/" + r.solutionSlug + "</code><br/>";
  if (r.branch) html += "Branch: <code>" + r.branch + "</code><br/>";
  if (r.sandboxId) html += "Sandbox: <code>" + r.sandboxId + "</code><br/>";
  if (r.changedFiles) html += "Files changed: " + r.changedFiles.length + "<br/>";
  if (r.pr && r.pr.url) html += 'Pull request: <a href="' + r.pr.url + '" target="_blank">' + r.pr.url + "</a>";
  else if (r.pushed) html += "Pushed (no PR opened).";
  el.innerHTML = html;
}

function finish(payload) {
  running = false;
  $("runBtn").disabled = false;
  $("runBtn").textContent = "Run";
  if (payload && payload.ok === false) {
    renderSteps(null);
  } else {
    document.querySelectorAll(".step.active").forEach((s) => { s.classList.remove("active"); s.classList.add("done"); });
  }
  if (es) { es.close(); es = null; }
}

async function loadConfig() {
  cfg = await (await fetch("/api/config")).json();
  const evalSel = $("eval");
  evalSel.innerHTML = "";
  cfg.evals.forEach((e) => {
    const o = document.createElement("option");
    o.value = e.slug; o.textContent = e.slug + (e.hasFolder ? "" : " (missing folder)");
    o.disabled = !e.hasFolder;
    evalSel.appendChild(o);
  });
  const hSel = $("harness");
  hSel.innerHTML = "";
  cfg.harnesses.forEach((h) => {
    const o = document.createElement("option");
    o.value = h.id; o.textContent = h.label + (h.hasKey ? "" : " — no key");
    hSel.appendChild(o);
  });
  updateModelHint();

  const b = $("badges"); b.innerHTML = "";
  const badge = (label, ok) => { const s = document.createElement("span"); s.className = "badge " + (ok ? "ok" : "no"); s.textContent = label; b.appendChild(s); };
  badge("Daytona", cfg.env.daytona);
  badge("GitHub", cfg.env.github);
  cfg.harnesses.forEach((h) => badge(h.id, h.hasKey));
}

function updateModelHint() {
  const h = cfg.harnesses.find((x) => x.id === $("harness").value);
  $("model").placeholder = h && h.defaultModel ? h.defaultModel : "(harness default)";
  $("model-hint").textContent = h && h.hasKey ? "" : "No API key set for this harness — only dry runs will work.";
}

$("harness").addEventListener("change", updateModelHint);

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (running) return;
  const body = {
    eval: $("eval").value,
    harness: $("harness").value,
    model: $("model").value.trim(),
    timeout: Number($("timeout").value) || 3600,
    dryRun: $("dryRun").checked,
    push: $("push").checked,
    openPr: $("openPr").checked,
    draft: $("draft").checked,
    keepSandbox: $("keepSandbox").checked,
  };
  $("console").innerHTML = "";
  $("result").classList.add("hidden");
  renderSteps(null);
  running = true;
  $("runBtn").disabled = true;
  $("runBtn").textContent = "Running…";

  const resp = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await resp.json();
  if (!resp.ok) { append("l-error", "Error: " + (data.error || "failed to start") + "\\n"); finish({ ok: false }); return; }

  es = new EventSource("/api/runs/" + data.runId + "/stream");
  es.onmessage = (m) => { try { handleEvent(JSON.parse(m.data)); } catch {} };
  es.onerror = () => { /* connection closed; finish() also closes it */ };
});

loadConfig();
</script>
</body>
</html>`;
}
