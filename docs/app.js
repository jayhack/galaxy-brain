"use strict";

/* ------------------------------------------------------------------ */
/* state                                                               */
/* ------------------------------------------------------------------ */

const state = {
  data: null,
  view: document.getElementById("view"),
  sidebar: document.getElementById("sidebar-nav"),
  themeMenu: document.getElementById("theme-menu"),
  themes: {
    light: ["lofi", "light", "cupcake", "emerald", "corporate", "retro", "garden", "pastel", "nord", "autumn", "winter"],
    dark: ["night", "dracula", "synthwave", "business"],
  },
  markdownCache: new Map(),
};

/* ------------------------------------------------------------------ */
/* utils                                                               */
/* ------------------------------------------------------------------ */

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function repoUrls(data) {
  const { owner, name, branch } = data.repo;
  const base = `https://github.com/${owner}/${name}`;
  const raw = `https://raw.githubusercontent.com/${owner}/${name}/${branch}`;
  return {
    repo: base,
    branchTree: `${base}/tree/${branch}`,
    blob: (path) => `${base}/blob/${branch}/${path}`,
    tree: (path) => `${base}/tree/${branch}/${path}`,
    raw: (path) => `${raw}/${path}`,
  };
}

/** Resolve `artifactUrl` from data.json (e.g. `./artifacts/<eval>/<harness-model>.html`) to an absolute URL on this GitHub Pages site. */
function siteArtifactUrl(artifactUrl) {
  if (!artifactUrl) return null;
  const path = String(artifactUrl).replace(/^\.\//, "");
  const u = new URL(location.href);
  const basePath = u.pathname.endsWith("/") ? u.pathname : u.pathname.replace(/\/[^/]*$/, "/");
  return new URL(path, u.origin + basePath).href;
}

function statusBadge(status) {
  const map = {
    submitted: "badge-info",
    passed: "badge-success",
    failed: "badge-error",
    in_progress: "badge-warning",
    skipped: "badge-ghost",
  };
  const cls = map[status] || "badge-ghost";
  return `<span class="badge ${cls} badge-sm gap-1 capitalize">${esc(status || "unknown")}</span>`;
}

async function fetchMarkdown(url) {
  if (state.markdownCache.has(url)) return state.markdownCache.get(url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    state.markdownCache.set(url, text);
    return text;
  } catch (e) {
    return null;
  }
}

function renderMarkdown(md) {
  marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: true });
  const html = marked.parse(md);
  return DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] });
}

/* ------------------------------------------------------------------ */
/* router                                                              */
/* ------------------------------------------------------------------ */

function parseHash() {
  const raw = (location.hash || "#/").slice(1);
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "eval" && parts.length === 2) {
    return { name: "eval", evalSlug: parts[1] };
  }
  if (parts[0] === "eval" && parts.length >= 3) {
    return { name: "solution", evalSlug: parts[1], solutionSlug: parts[2] };
  }
  return { name: "home" };
}

function navigate(hash) {
  if (location.hash === hash) {
    render();
  } else {
    location.hash = hash;
  }
}

window.addEventListener("hashchange", () => {
  render();
  // Close mobile drawer on navigation.
  const drawer = document.getElementById("nav-drawer");
  if (drawer && window.innerWidth < 1024) drawer.checked = false;
  window.scrollTo({ top: 0 });
});

/* ------------------------------------------------------------------ */
/* sidebar                                                             */
/* ------------------------------------------------------------------ */

function renderSidebar(route) {
  const items = [];
  items.push(
    `<a href="#/" class="sidebar-link ${route.name === "home" ? "active" : ""}">
       <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l9-9 9 9M5 10v10h4v-6h6v6h4V10"/></svg>
       <span>Overview</span>
     </a>`
  );

  for (const ev of state.data.evals) {
    items.push(`<div class="sidebar-eval-header">${esc(ev.title)}</div>`);
    const evActive = route.name === "eval" && route.evalSlug === ev.slug;
    items.push(
      `<a href="#/eval/${esc(ev.slug)}" class="sidebar-link ${evActive ? "active" : ""}">
         <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14l-4-2-3 2-3-2-4 2V6a2 2 0 012-2z"/></svg>
         <span>Prompt</span>
       </a>`
    );
    for (const sol of ev.solutions) {
      const solActive =
        route.name === "solution" &&
        route.evalSlug === ev.slug &&
        route.solutionSlug === sol.slug;
      const shortHarness = sol.harnessShort || sol.harness.split("-")[0];
      items.push(
        `<a href="#/eval/${esc(ev.slug)}/${esc(sol.slug)}"
            class="sidebar-link ${solActive ? "active" : ""}"
            title="${esc(sol.slug)} · ${esc(sol.harness)}/${esc(sol.model)}">
           <span class="sidebar-badge">${esc(shortHarness)}</span>
           <span class="sidebar-slug font-mono">${esc(sol.slug)}</span>
         </a>`
      );
    }
    if (ev.solutions.length === 0) {
      items.push(
        `<div class="sidebar-link text-base-content/40 italic" style="cursor:default">no solutions yet</div>`
      );
    }
  }

  state.sidebar.innerHTML = items.join("");
}

/* ------------------------------------------------------------------ */
/* views                                                               */
/* ------------------------------------------------------------------ */

function viewHome() {
  const data = state.data;
  const totalSolutions = data.evals.reduce((n, e) => n + e.solutions.length, 0);
  const passed = data.evals.reduce(
    (n, e) => n + e.solutions.filter((s) => s.outcome?.status === "passed").length,
    0
  );

  const evalCards = data.evals
    .map((ev) => {
      const tags = (ev.tags || [])
        .map((t) => `<span class="badge badge-ghost badge-sm">${esc(t)}</span>`)
        .join(" ");
      const solBadges = ev.solutions
        .slice(0, 4)
        .map(
          (s) =>
            `<span class="badge badge-outline badge-sm" title="${esc(s.harness)} · ${esc(s.model)}">${esc(s.slug)}</span>`
        )
        .join(" ");
      const more =
        ev.solutions.length > 4
          ? `<span class="badge badge-ghost badge-sm">+${ev.solutions.length - 4}</span>`
          : "";
      return `
        <a href="#/eval/${esc(ev.slug)}" class="card bg-base-200 hover:bg-base-300 transition-colors border border-base-300 hover:border-primary/40">
          <div class="card-body gap-3">
            <div class="flex items-start justify-between gap-3">
              <h3 class="card-title text-lg font-semibold">${esc(ev.title)}</h3>
              <span class="badge badge-primary badge-sm">${ev.solutions.length} solution${ev.solutions.length === 1 ? "" : "s"}</span>
            </div>
            <p class="text-sm text-base-content/70">${esc(ev.tagline || ev.description || "")}</p>
            <div class="flex flex-wrap gap-1.5 mt-1">${tags}</div>
            <div class="flex flex-wrap gap-1.5 mt-2">${solBadges} ${more}</div>
          </div>
        </a>`;
    })
    .join("");

  state.view.innerHTML = `
    <section class="hero bg-base-200 rounded-2xl border border-base-300 mb-10">
      <div class="hero-content py-12 px-6 lg:px-12 text-left w-full">
        <div class="max-w-3xl">
          <div class="flex items-center gap-2 mb-4">
            <span class="badge badge-primary badge-outline">v0</span>
            <span class="badge badge-ghost">${data.evals.length} eval${data.evals.length === 1 ? "" : "s"}</span>
            <span class="badge badge-ghost">${totalSolutions} submission${totalSolutions === 1 ? "" : "s"}</span>
          </div>
          <h1 class="text-4xl md:text-5xl font-bold tracking-tight">
            <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">galaxy-brain</span>
          </h1>
          <p class="text-base-content/70 mt-3 text-lg">
            A collection of agent evals. Each eval is a prompt; each solution is one
            harness/model pair's attempt. Browse them below.
          </p>
          <div class="mt-6 flex flex-wrap gap-2">
            <a href="#/eval/${esc(data.evals[0]?.slug || "")}" class="btn btn-primary btn-sm">
              Browse evals
            </a>
            <a id="hero-repo" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div class="flex items-baseline justify-between mb-4">
        <h2 class="text-xl font-semibold">Evals</h2>
        <span class="text-sm text-base-content/60">${passed}/${totalSolutions} passed</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${evalCards}</div>
    </section>
  `;

  document.getElementById("hero-repo").href = repoUrls(data).repo;
}

function viewEval(route) {
  const data = state.data;
  const ev = data.evals.find((e) => e.slug === route.evalSlug);
  if (!ev) return view404(`Unknown eval: ${route.evalSlug}`);

  const urls = repoUrls(data);
  const promptPath = `${ev.slug}/README.md`;

  const tags = (ev.tags || [])
    .map((t) => `<span class="badge badge-ghost badge-sm">${esc(t)}</span>`)
    .join(" ");

  const solRows =
    ev.solutions.length === 0
      ? `<div class="alert">No solutions submitted yet.</div>`
      : ev.solutions
          .map((sol) => {
            const tech = (sol.tech || [])
              .map((t) => `<span class="badge badge-outline badge-xs">${esc(t)}</span>`)
              .join(" ");
            const htmlOut = siteArtifactUrl(sol.artifactUrl);
            const htmlBtn = htmlOut
              ? `<a href="${esc(htmlOut)}" target="_blank" rel="noopener" class="btn btn-xs btn-outline gap-1 shrink-0" onclick="event.stopPropagation()">
                   <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                   HTML output
                 </a>`
              : "";
            return `
              <a href="#/eval/${esc(ev.slug)}/${esc(sol.slug)}" class="card bg-base-200 hover:bg-base-300 transition-colors border border-base-300 hover:border-primary/40">
                <div class="card-body gap-2">
                  <div class="flex items-start justify-between gap-3 flex-wrap">
                    <div class="min-w-0 flex-1">
                      <h3 class="card-title text-base font-semibold font-mono">${esc(sol.slug)}</h3>
                      <p class="text-xs text-base-content/60 mt-0.5">
                        <span class="font-mono">${esc(sol.harness)}</span>
                        ·
                        <span class="font-mono">${esc(sol.model)}</span>
                        ${sol.projectName ? `· project <span class="font-mono">${esc(sol.projectName)}</span>` : ""}
                      </p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      ${htmlBtn}
                      ${statusBadge(sol.outcome?.status)}
                    </div>
                  </div>
                  <p class="text-sm text-base-content/80">${esc(sol.summary || "")}</p>
                  <div class="flex flex-wrap gap-1.5 mt-1">${tech}</div>
                </div>
              </a>`;
          })
          .join("");

  state.view.innerHTML = `
    <nav class="text-sm breadcrumbs mb-4">
      <ul>
        <li><a href="#/">Overview</a></li>
        <li class="text-base-content/70">${esc(ev.title)}</li>
      </ul>
    </nav>

    <header class="mb-6">
      <div class="flex items-center gap-2 mb-2 flex-wrap">
        ${tags}
      </div>
      <h1 class="text-3xl font-bold tracking-tight">${esc(ev.title)}</h1>
      <p class="text-base-content/70 mt-2 max-w-3xl">${esc(ev.description || ev.tagline || "")}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <a class="btn btn-sm btn-primary" href="${esc(urls.tree(ev.slug))}" target="_blank" rel="noopener">View on GitHub</a>
        <a class="btn btn-sm btn-ghost" href="${esc(urls.blob(promptPath))}" target="_blank" rel="noopener">Edit prompt</a>
      </div>
    </header>

    <section class="mb-10">
      <div class="flex items-center justify-between mb-3 max-w-xl mx-auto w-full">
        <h2 class="text-xl font-semibold">Solutions</h2>
        <span class="text-sm text-base-content/60">${ev.solutions.length} total</span>
      </div>
      <div class="max-w-xl mx-auto w-full grid grid-cols-1 gap-3">${solRows}</div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-semibold">Prompt</h2>
        <span class="text-xs text-base-content/50 font-mono">${esc(promptPath)}</span>
      </div>
      <article id="prompt-md" class="prose max-w-none bg-base-200 border border-base-300 rounded-2xl p-6 markdown-target">
        <div class="flex items-center gap-2 text-base-content/60 text-sm">
          <span class="loading loading-dots loading-sm"></span>
          loading prompt…
        </div>
      </article>
    </section>
  `;

  fetchMarkdown(urls.raw(promptPath)).then((md) => {
    const target = document.getElementById("prompt-md");
    if (!target) return;
    if (md == null) {
      target.innerHTML = `<p class="text-base-content/60">Couldn't load <code>${esc(promptPath)}</code>. <a class="link" target="_blank" rel="noopener" href="${esc(urls.blob(promptPath))}">Open on GitHub.</a></p>`;
      return;
    }
    target.innerHTML = renderMarkdown(md);
  });
}

function viewSolution(route) {
  const data = state.data;
  const ev = data.evals.find((e) => e.slug === route.evalSlug);
  if (!ev) return view404(`Unknown eval: ${route.evalSlug}`);
  const sol = ev.solutions.find((s) => s.slug === route.solutionSlug);
  if (!sol) return view404(`Unknown solution: ${route.solutionSlug}`);

  const urls = repoUrls(data);
  const dirPath = `${ev.slug}/${sol.slug}`;
  const innerProject = sol.projectName
    ? `${dirPath}/${sol.projectName}`
    : dirPath;
  const readmeCandidates = [
    `${innerProject}/README.md`,
    `${dirPath}/README.md`,
  ];

  const tech = (sol.tech || [])
    .map((t) => `<span class="badge badge-outline badge-sm">${esc(t)}</span>`)
    .join(" ");

  const oc = sol.outcome || {};
  const deployedHtml = siteArtifactUrl(sol.artifactUrl);

  state.view.innerHTML = `
    <nav class="text-sm breadcrumbs mb-4">
      <ul>
        <li><a href="#/">Overview</a></li>
        <li><a href="#/eval/${esc(ev.slug)}">${esc(ev.title)}</a></li>
        <li class="text-base-content/70 font-mono">${esc(sol.slug)}</li>
      </ul>
    </nav>

    <header class="mb-8">
      <div class="flex items-center gap-2 mb-2">
        ${statusBadge(oc.status)}
        <span class="badge badge-ghost badge-sm">${esc(sol.harness)}</span>
        <span class="badge badge-ghost badge-sm">${esc(sol.model)}</span>
        ${sol.submittedAt ? `<span class="badge badge-ghost badge-sm">submitted ${esc(sol.submittedAt)}</span>` : ""}
      </div>
      <h1 class="text-3xl font-bold tracking-tight font-mono">${esc(sol.slug)}</h1>
      ${sol.projectName ? `<p class="text-base-content/70 mt-1">project: <span class="font-mono">${esc(sol.projectName)}</span></p>` : ""}
      <p class="text-base-content/80 mt-3 max-w-3xl">${esc(sol.summary || "")}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        ${
          deployedHtml
            ? `<a class="btn btn-sm btn-primary" href="${esc(deployedHtml)}" target="_blank" rel="noopener">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                 Open HTML output
               </a>`
            : ""
        }
        <a class="btn btn-sm ${deployedHtml ? "btn-ghost" : "btn-primary"}" href="${esc(urls.tree(dirPath))}" target="_blank" rel="noopener">Source on GitHub</a>
        <a class="btn btn-sm btn-ghost" href="${esc(urls.blob(`${innerProject}/README.md`))}" target="_blank" rel="noopener">Open README</a>
        ${
          sol.artifactUrl
            ? `<a class="btn btn-sm btn-secondary" href="${esc(sol.artifactUrl)}" target="_blank" rel="noopener">Open artifact</a>`
            : ""
        }
      </div>
    </header>

    <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
      <div class="card bg-base-200 border border-base-300 lg:col-span-2">
        <div class="card-body">
          <h2 class="card-title text-base">Outcome</h2>
          <div class="grid grid-cols-2 gap-3 mt-1">
            <div>
              <div class="text-xs uppercase text-base-content/50 tracking-wider">status</div>
              <div class="mt-1">${statusBadge(oc.status)}</div>
            </div>
            <div>
              <div class="text-xs uppercase text-base-content/50 tracking-wider">evaluated</div>
              <div class="mt-1 text-sm">${esc(oc.evaluatedAt || "—")}</div>
            </div>
            <div>
              <div class="text-xs uppercase text-base-content/50 tracking-wider">score</div>
              <div class="mt-1 text-sm">${oc.score == null ? "—" : esc(String(oc.score))}</div>
            </div>
            <div>
              <div class="text-xs uppercase text-base-content/50 tracking-wider">harness/model</div>
              <div class="mt-1 text-sm font-mono">${esc(sol.harness)} · ${esc(sol.model)}</div>
            </div>
          </div>
          ${
            oc.verdict
              ? `<div class="mt-4">
                  <div class="text-xs uppercase text-base-content/50 tracking-wider mb-1">verdict</div>
                  <p class="text-sm text-base-content/85">${esc(oc.verdict)}</p>
                </div>`
              : ""
          }
        </div>
      </div>

      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-base">Stack</h2>
          <div class="flex flex-wrap gap-1.5 mt-1">${tech || `<span class="text-base-content/50 text-sm">—</span>`}</div>
          ${
            sol.notes
              ? `<div class="mt-4">
                  <div class="text-xs uppercase text-base-content/50 tracking-wider mb-1">notes</div>
                  <p class="text-sm text-base-content/80">${esc(sol.notes)}</p>
                </div>`
              : ""
          }
        </div>
      </div>
    </section>

    <section class="mb-10">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-semibold">README</h2>
        <span id="readme-path" class="text-xs text-base-content/50 font-mono"></span>
      </div>
      <article id="solution-md" class="prose max-w-none bg-base-200 border border-base-300 rounded-2xl p-6 markdown-target">
        <div class="flex items-center gap-2 text-base-content/60 text-sm">
          <span class="loading loading-dots loading-sm"></span>
          loading README…
        </div>
      </article>
    </section>

    <section>
      <h2 class="text-xl font-semibold mb-3">Other solutions for this eval</h2>
      <div class="flex flex-wrap gap-2">
        ${
          ev.solutions
            .filter((s) => s.slug !== sol.slug)
            .map(
              (s) =>
                `<a href="#/eval/${esc(ev.slug)}/${esc(s.slug)}" class="badge badge-lg badge-outline hover:badge-primary">${esc(s.slug)}</a>`
            )
            .join(" ") ||
          `<span class="text-base-content/50 text-sm">none yet</span>`
        }
      </div>
    </section>
  `;

  (async () => {
    for (const path of readmeCandidates) {
      const md = await fetchMarkdown(urls.raw(path));
      if (md != null) {
        const target = document.getElementById("solution-md");
        const pathEl = document.getElementById("readme-path");
        if (target) target.innerHTML = renderMarkdown(md);
        if (pathEl) pathEl.textContent = path;
        return;
      }
    }
    const target = document.getElementById("solution-md");
    if (target) {
      target.innerHTML = `<p class="text-base-content/60">No README found for this solution. <a class="link" target="_blank" rel="noopener" href="${esc(urls.tree(dirPath))}">Browse the directory.</a></p>`;
    }
  })();
}

function view404(msg) {
  state.view.innerHTML = `
    <div class="hero bg-base-200 rounded-2xl border border-base-300">
      <div class="hero-content text-center py-16">
        <div class="max-w-md">
          <h1 class="text-3xl font-bold">Not found</h1>
          <p class="text-base-content/70 mt-2">${esc(msg)}</p>
          <a href="#/" class="btn btn-primary btn-sm mt-6">Back to overview</a>
        </div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* theme                                                               */
/* ------------------------------------------------------------------ */

function setupTheme() {
  const allThemes = [...state.themes.light, ...state.themes.dark];
  const stored = localStorage.getItem("gb:theme");
  const initial = stored && allThemes.includes(stored) ? stored : "lofi";
  document.documentElement.setAttribute("data-theme", initial);

  const groupHtml = (label, list) => `
    <li class="menu-title pt-2"><span class="text-[10px] uppercase tracking-wider">${label}</span></li>
    ${list
      .map(
        (t) => `
        <li>
          <button data-theme-set="${t}" class="capitalize gap-2 ${t === initial ? "active" : ""}">
            <span class="inline-flex gap-1" aria-hidden="true">
              <span class="w-2 h-3 rounded-sm border border-base-content/20" data-theme="${t}" style="background:oklch(var(--p))"></span>
              <span class="w-2 h-3 rounded-sm border border-base-content/20" data-theme="${t}" style="background:oklch(var(--s))"></span>
              <span class="w-2 h-3 rounded-sm border border-base-content/20" data-theme="${t}" style="background:oklch(var(--b1))"></span>
            </span>
            <span class="flex-1 text-left">${t}</span>
          </button>
        </li>`
      )
      .join("")}
  `;

  state.themeMenu.classList.add("max-h-96", "overflow-y-auto", "flex-nowrap");
  state.themeMenu.innerHTML = `
    ${groupHtml("light", state.themes.light)}
    ${groupHtml("dark", state.themes.dark)}
  `;

  state.themeMenu.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-set]");
    if (!btn) return;
    const t = btn.dataset.themeSet;
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("gb:theme", t);
    state.themeMenu
      .querySelectorAll("[data-theme-set]")
      .forEach((el) => el.classList.toggle("active", el.dataset.themeSet === t));
  });
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

function render() {
  const route = parseHash();
  renderSidebar(route);
  switch (route.name) {
    case "home":
      return viewHome();
    case "eval":
      return viewEval(route);
    case "solution":
      return viewSolution(route);
    default:
      return view404("Page not found");
  }
}

async function main() {
  setupTheme();

  let res;
  try {
    res = await fetch("./data.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
  } catch (e) {
    state.view.innerHTML = `
      <div class="alert alert-error">
        <span>Failed to load <code>data.json</code>: ${esc(e.message)}</span>
      </div>`;
    return;
  }

  const urls = repoUrls(state.data);
  document.getElementById("repo-link").href = urls.repo;
  document.getElementById("footer-repo-link").href = urls.repo;

  render();
}

main();
