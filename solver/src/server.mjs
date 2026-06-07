import http from "node:http";
import { firstEnv } from "./env.mjs";
import { listEvals } from "./evals.mjs";
import { listHarnesses } from "./harness.mjs";
import { githubToken } from "./github.mjs";
import { createEmitterReporter } from "./reporter.mjs";
import { run } from "./run.mjs";
import { dashboardHtml } from "./dashboard.mjs";

/** In-memory registry of runs for the lifetime of the server process. */
const runs = new Map();

function newRunId() {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function buildConfig() {
  return {
    harnesses: listHarnesses().map((h) => ({
      id: h.id,
      label: h.label,
      defaultModel: h.defaultModel ?? "",
      needsEnv: h.apiKey.aliases,
      hasKey: Boolean(firstEnv(...h.apiKey.aliases)),
    })),
    env: {
      daytona: Boolean(firstEnv("DAYTONA_API_KEY")),
      github: Boolean(githubToken()),
    },
  };
}

function startRun(options) {
  const id = newRunId();
  const emit = createEmitterReporter();
  const record = {
    id,
    options: {
      eval: options.eval,
      harness: options.harness,
      model: options.model || undefined,
      dryRun: Boolean(options.dryRun),
    },
    events: [],
    listeners: new Set(),
    status: "running",
    result: null,
    startedAt: Date.now(),
  };
  runs.set(id, record);

  // Buffer every event (for replay) and fan out to live SSE listeners.
  emit.subscribe((event) => {
    record.events.push(event);
    for (const listener of record.listeners) listener(event);
  });

  const dispatch = (type, payload) => {
    const event = { type, payload, t: Date.now() };
    record.events.push(event);
    for (const listener of record.listeners) listener(event);
  };

  // Kick off the run without blocking the HTTP response.
  run({
    eval: options.eval,
    harness: options.harness,
    model: options.model || undefined,
    solutionSlug: options.solutionSlug || undefined,
    branch: options.branch || undefined,
    baseBranch: options.baseBranch || undefined,
    snapshot: options.snapshot || undefined,
    timeout: options.timeout ? Number(options.timeout) : 3600,
    push: options.push !== false,
    openPr: options.openPr !== false,
    draft: options.draft !== false,
    keepSandbox: Boolean(options.keepSandbox),
    dryRun: Boolean(options.dryRun),
    emit,
  })
    .then((result) => {
      record.status = "done";
      record.result = result;
      dispatch("done", { ok: true });
    })
    .catch((error) => {
      record.status = "error";
      dispatch("error", error.message);
      dispatch("done", { ok: false, error: error.message });
    });

  return id;
}

function streamRun(req, res, id) {
  const record = runs.get(id);
  if (!record) return json(res, 404, { error: "unknown run" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`retry: 2000\n\n`);

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Replay everything that already happened, then attach for live updates.
  for (const event of record.events) send(event);
  if (record.status !== "running") {
    res.end();
    return;
  }

  const listener = (event) => {
    send(event);
    if (event.type === "done") {
      cleanup();
      res.end();
    }
  };
  record.listeners.add(listener);

  const heartbeat = setInterval(() => res.write(`: ping\n\n`), 15000);
  const cleanup = () => {
    clearInterval(heartbeat);
    record.listeners.delete(listener);
  };
  req.on("close", cleanup);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;

    try {
      if (req.method === "GET" && (path === "/" || path === "/index.html")) {
        const html = dashboardHtml();
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": Buffer.byteLength(html),
        });
        return res.end(html);
      }

      if (req.method === "GET" && path === "/api/config") {
        const config = buildConfig();
        const evals = await listEvals();
        return json(res, 200, { ...config, evals });
      }

      if (req.method === "POST" && path === "/api/run") {
        const body = await readBody(req);
        if (!body.eval || !body.harness) {
          return json(res, 400, { error: "eval and harness are required" });
        }
        const id = startRun(body);
        return json(res, 200, { runId: id });
      }

      const streamMatch = path.match(/^\/api\/runs\/([^/]+)\/stream$/);
      if (req.method === "GET" && streamMatch) {
        return streamRun(req, res, streamMatch[1]);
      }

      json(res, 404, { error: "not found" });
    } catch (error) {
      json(res, 500, { error: error.message });
    }
  });
}

export function serve({ port = 4505, host = "127.0.0.1" } = {}) {
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const url = `http://${host}:${port}`;
      console.log(`\n  galaxy-brain solver dashboard running at ${url}\n`);
      const cfg = buildConfig();
      const missing = [];
      if (!cfg.env.daytona) missing.push("DAYTONA_API_KEY");
      if (!cfg.env.github) missing.push("GITHUB_TOKEN (push/PR)");
      const noKeyHarnesses = cfg.harnesses.filter((h) => !h.hasKey).map((h) => h.id);
      if (missing.length) console.log(`  Note: missing ${missing.join(", ")}.`);
      if (noKeyHarnesses.length)
        console.log(`  Harnesses without an API key: ${noKeyHarnesses.join(", ")}.`);
      console.log(`  You can still use --dry-run with no keys.\n`);
      resolve({ server, url });
    });
  });
}
