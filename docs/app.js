"use strict";

/* ------------------------------------------------------------------ */
/* state                                                               */
/* ------------------------------------------------------------------ */

const state = {
  data: null,
  view: document.getElementById("view"),
  sidebar: document.getElementById("sidebar-nav"),
  headerBreadcrumbs: document.getElementById("header-breadcrumbs"),
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

function updateHeaderBreadcrumbs(html) {
  if (state.headerBreadcrumbs) state.headerBreadcrumbs.innerHTML = html || "";
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** GitHub Octicon-style mark (filled), for buttons and links. */
function githubLogoSvg(className = "w-4 h-4") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="${esc(className)} fill-current shrink-0" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.18c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>`;
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
  const label = status || "unknown";
  return `<span class="badge ${cls} badge-sm whitespace-nowrap capitalize inline-flex items-center">${esc(label)}</span>`;
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
  const fullHash = location.hash || "#/";
  const legacy = /^#\/eval\/private-memory(\/.*)?$/.exec(fullHash);
  if (legacy) {
    const next = `#/eval/web-short-story${legacy[1] || ""}`;
    history.replaceState(null, "", `${location.pathname}${location.search}${next}`);
  }
  const raw = (location.hash || "#/").slice(1);
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "about") return { name: "about" };
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
  items.push(
    `<a href="#/about" class="sidebar-link ${route.name === "about" ? "active" : ""}">
       <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
       <span>About</span>
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

  updateHeaderBreadcrumbs("");

  state.view.innerHTML = `
    <section class="hero bg-base-200 rounded-2xl border border-base-300 mb-10">
      <div class="hero-content py-12 px-6 lg:px-12 text-left w-full">
        <div class="max-w-3xl">
          <div class="flex items-center gap-2 mb-4">
            <span class="badge badge-primary badge-outline">v0</span>
            <span class="badge badge-ghost">${data.evals.length} eval${data.evals.length === 1 ? "" : "s"}</span>
            <span class="badge badge-ghost">${totalSolutions} submission${totalSolutions === 1 ? "" : "s"}</span>
          </div>
          <div class="flex flex-wrap items-center gap-3 md:gap-5 mb-1">
            <span
              class="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-secondary text-4xl md:text-5xl leading-none select-none"
              aria-hidden="true"
              >🧠</span
            >
            <h1 class="text-4xl md:text-5xl font-bold tracking-tight text-base-content min-w-0">
              galaxy-brain
            </h1>
          </div>
          <p class="text-base-content/70 mt-3 text-lg">
            A collection of agent evals. Each eval is a prompt; each solution is one
            harness/model pair's attempt. Browse them below.
          </p>
          <div class="mt-6 flex flex-wrap gap-2">
            <a id="hero-repo" class="btn btn-ghost btn-sm gap-2" target="_blank" rel="noopener">
              ${githubLogoSvg()}
              <span>GitHub</span>
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

function viewAbout() {
  const data = state.data;
  const urls = repoUrls(data);

  const compLinks = [
    {
      href: "https://chat.lmsys.org/",
      title: "LMSYS Chatbot Arena",
      blurb:
        "Large-scale pairwise human preferences over model outputs; Elo-style leaderboards from crowd votes. The canonical example of subjective eval at scale.",
    },
    {
      href: "https://huggingface.co/spaces/lmsys/mt-bench",
      title: "MT-Bench",
      blurb:
        "Multi-turn dialogue benchmark scored with strong models (and originally designed to align with human judgment). Good reference for structured-but-still-quality-focused evaluation.",
    },
    {
      href: "https://tatsu-lab.github.io/alpaca_eval/",
      title: "AlpacaEval",
      blurb:
        "Automatic pairwise comparisons (often via a strong judge model) against reference outputs; correlates with human preferences on instruction-following.",
    },
    {
      href: "https://huggingface.co/spaces/allenai/WildBench",
      title: "WildBench",
      blurb:
        "Tasks mined from real user–chatbot logs, with model-based pairwise scoring designed to track human Arena rankings.",
    },
    {
      href: "https://crfm.stanford.edu/helm/",
      title: "HELM (Holistic Evaluation of Language Models)",
      blurb:
        "Broad, scenario-based reporting across accuracy, calibration, robustness, fairness, toxicity, and efficiency—not purely “vibes,” but a major effort to make comparisons transparent and multi-dimensional.",
    },
    {
      href: "https://www.swebench.com/",
      title: "SWE-bench",
      blurb:
        "Real GitHub issues patched end-to-end; the flagship objective benchmark for coding agents (pass/fail on applied patches). Complements subjective build-quality reviews.",
    },
    {
      href: "https://github.com/google-research/google-research/tree/master/instruction_following_eval",
      title: "Google IFEval",
      blurb:
        "Verifiable instruction-following checks (counts, formatting, constraints)—useful contrast to open-ended “how good does this feel?” grading.",
    },
  ];

  const listItems = compLinks
    .map(
      (c) => `
      <li class="border border-base-300 rounded-xl p-4 bg-base-200/50">
        <a href="${esc(c.href)}" class="link link-primary font-semibold" target="_blank" rel="noopener">${esc(c.title)}</a>
        <p class="text-sm text-base-content/75 mt-2 mb-0">${esc(c.blurb)}</p>
      </li>`
    )
    .join("");

  state.view.innerHTML = `
    <nav class="text-sm breadcrumbs mb-4">
      <ul>
        <li><a href="#/">Overview</a></li>
        <li class="text-base-content/70">About</li>
      </ul>
    </nav>

    <article class="prose prose-sm max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-base-content">About galaxy-brain</h1>
      <p class="text-base-content/80">
        This repo is a <strong>personal</strong> set of evals: prompts and tasks I care about, know well, and can judge consistently.
        The site is for <strong>comparing submissions side by side</strong> and <strong>tracking how outcomes change over time</strong> as models and harnesses improve.
      </p>
      <p class="text-base-content/80">
        People can send <strong>pull requests</strong> with solutions; I run the evals myself (including open-ended or subjective parts) rather than outsourcing scoring to a crowd or an automated metric alone.
        That keeps the bar aligned with what I actually want from agents—not only what is easy to grade automatically.
      </p>

      <h2 class="text-xl font-semibold text-base-content mt-10">Comparable efforts (larger or different in spirit)</h2>
      <p class="text-base-content/80">
        If you are looking for <em>large-scale subjective</em> or “quality in the wild” comparisons, these are well-known references. They differ from this project in scale and governance, but they answer a similar “which model feels better on hard tasks?” question.
      </p>
      <ul class="list-none pl-0 space-y-3 not-prose max-w-3xl">${listItems}</ul>

      <h2 class="text-xl font-semibold text-base-content mt-10">Source</h2>
      <p class="text-base-content/80">
        <a href="${esc(urls.repo)}" class="link link-primary" target="_blank" rel="noopener">Repository on GitHub</a>
        — eval prompts live next to submitted solutions; this site reads <code class="text-xs">docs/data.json</code> for the browser.
      </p>
    </article>
  `;
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
            const htmlOut = siteArtifactUrl(sol.artifactUrl);
            const htmlBtn = htmlOut
              ? `<a href="${esc(htmlOut)}" target="_blank" rel="noopener" class="btn btn-xs btn-outline gap-1 h-7 min-h-7 px-2 shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                   HTML
                 </a>`
              : "";
            const metaBits = [
              esc(sol.harness),
              esc(sol.model),
              sol.projectName ? `project ${esc(sol.projectName)}` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            const firstTech = (sol.tech && sol.tech[0]) || "";
            const techBadge = firstTech
              ? `<span class="badge badge-outline badge-sm font-mono shrink-0 max-w-[5.5rem] truncate" title="${esc(firstTech)}">${esc(firstTech)}</span>`
              : "";
            return `
              <div class="flex flex-nowrap flex-row items-stretch w-full min-w-0 rounded-lg border border-base-300 bg-base-200 overflow-hidden hover:border-primary/30 transition-colors">
                <a href="#/eval/${esc(ev.slug)}/${esc(sol.slug)}" class="group flex flex-1 min-w-0 flex-nowrap flex-row items-center gap-2 sm:gap-3 px-3 py-2 hover:bg-base-300/60">
                  ${techBadge}
                  <span class="font-mono text-sm font-semibold text-base-content shrink-0 max-w-[40%] sm:max-w-none truncate">${esc(sol.slug)}</span>
                  <span class="text-[11px] sm:text-xs text-base-content/55 font-mono truncate shrink-0 max-w-[7.5rem] sm:max-w-[11rem]">${metaBits}</span>
                  <span class="text-xs text-base-content/65 truncate min-w-0 flex-1" title="${esc(sol.summary || "")}">${esc(sol.summary || "")}</span>
                </a>
                <div class="flex items-center gap-1.5 sm:gap-2 shrink-0 border-l border-base-300/80 pl-2 pr-3 py-2">
                  ${htmlBtn}
                  ${statusBadge(sol.outcome?.status)}
                </div>
              </div>`;
          })
          .join("");

  updateHeaderBreadcrumbs(`
    <nav class="text-sm breadcrumbs breadcrumbs-header max-w-full min-w-0">
      <ul class="flex-nowrap max-w-full">
        <li class="min-w-0 shrink"><a href="#/">Overview</a></li>
        <li class="text-base-content/70 min-w-0 truncate">${esc(ev.title)}</li>
      </ul>
    </nav>
  `);

  state.view.innerHTML = `
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

    <section class="mb-10 w-full max-w-full min-w-0">
      <div class="flex items-center justify-between mb-3 w-full">
        <h2 class="text-xl font-semibold">Solutions</h2>
        <span class="text-sm text-base-content/60">${ev.solutions.length} total</span>
      </div>
      <div class="w-full flex flex-col gap-1.5">${solRows}</div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-semibold">Prompt</h2>
        <span class="text-xs text-base-content/50 font-mono">${esc(promptPath)}</span>
      </div>
      <article id="prompt-md" class="prose prose-sm max-w-none bg-base-200 border border-base-300 rounded-2xl p-4 markdown-target">
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

  updateHeaderBreadcrumbs(`
    <nav class="text-sm breadcrumbs breadcrumbs-header max-w-full min-w-0">
      <ul class="flex-nowrap max-w-full">
        <li class="min-w-0 shrink"><a href="#/">Overview</a></li>
        <li class="min-w-0 shrink"><a href="#/eval/${esc(ev.slug)}">${esc(ev.title)}</a></li>
        <li class="text-base-content/70 font-mono min-w-0 truncate">${esc(sol.slug)}</li>
      </ul>
    </nav>
  `);

  state.view.innerHTML = `
    <header class="mb-8">
      <div class="flex flex-wrap items-center gap-2 mb-2">
        ${statusBadge(oc.status)}
        <span class="badge badge-ghost badge-sm">${esc(sol.harness)}</span>
        <span class="badge badge-ghost badge-sm">${esc(sol.model)}</span>
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
      <article id="solution-md" class="prose prose-sm max-w-none bg-base-200 border border-base-300 rounded-2xl p-4 markdown-target">
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
  updateHeaderBreadcrumbs("");
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
    case "about":
      return viewAbout();
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
    updateHeaderBreadcrumbs("");
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
