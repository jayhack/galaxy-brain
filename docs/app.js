"use strict";

import { ui, statusBadgeClasses } from "./ui.js";

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
  /** True after `viewHome` registered delegated click handler for tag filter. */
  homeTagFilterClickBound: false,
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

/** Two overlapping squares (clipboard), for copy actions. */
function copyIconSvg(className = "w-4 h-4") {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${esc(className)} shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`;
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

/** GitHub Octicon-style mark (filled), for buttons and links. */
function githubLogoSvg(className = "w-4 h-4") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="${esc(className)} fill-current shrink-0" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.18c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>`;
}

/**
 * Maps harness string from data.json to a logo family (inline SVG paths from Simple Icons, CC0).
 * Supports cursor, codex, and claude-* (e.g. claude-code).
 */
function harnessLogoKind(harness) {
  const h = String(harness ?? "")
    .trim()
    .toLowerCase();
  if (!h) return null;
  if (h === "cursor" || h.startsWith("cursor-")) return "cursor";
  if (h === "codex" || h.startsWith("codex-")) return "codex";
  if (h === "claude" || h.startsWith("claude-")) return "claude";
  return null;
}

const HARNESS_LOGO_SVG_CLASS = ui.harnessLogoSvgClass;

/** Brand mark for sidebar / badges: Cursor, Anthropic (Claude), OpenAI (Codex). */
function harnessLogoSvg(harness, className = HARNESS_LOGO_SVG_CLASS) {
  const kind = harnessLogoKind(harness);
  if (!kind) return "";
  const paths = {
    cursor:
      "M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23",
    claude:
      "M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z",
    codex:
      "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z",
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="${esc(className)} fill-current shrink-0" aria-hidden="true"><path d="${paths[kind]}"/></svg>`;
}

/** Fixed-size slot so harness icons align (sidebar, solution rows, badges). */
function harnessIconSlot(harness, slotClass = ui.harnessIconSlotMd) {
  const svg = harnessLogoSvg(harness, HARNESS_LOGO_SVG_CLASS);
  if (!svg) return "";
  return `<span class="${esc(slotClass)}" aria-hidden="true">${svg}</span>`;
}

function harnessShortLabel(sol) {
  return sol.harnessShort || sol.harness.split("-")[0];
}

/** Harness + model as two ghost badges (icon + short harness, then model). */
function harnessModelBadgesHtml(sol) {
  const short = harnessShortLabel(sol);
  const icon = harnessIconSlot(sol.harness, ui.harnessIconSlotSm);
  const harnessInner = icon
    ? `${icon}<span class="${ui.harnessBadgeShort}">${esc(short)}</span>`
    : `<span class="${ui.harnessBadgeShort}">${esc(short)}</span>`;
  return `<span class="${ui.badgeGhostSmHarness}">${harnessInner}</span><span class="${ui.badgeGhostSmModel}">${esc(sol.model)}</span>`;
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
  const label = status || "unknown";
  return `<span class="${statusBadgeClasses(status)}">${esc(label)}</span>`;
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

/** Build overview hash from selected eval tags (`#/`, `#/tag/a+b`). */
function homeHashFromTags(tags) {
  const uniq = [...new Set(tags)].filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (uniq.length === 0) return "#/";
  return `#/tag/${uniq.map((t) => encodeURIComponent(t)).join("+")}`;
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
  if (parts.length === 0) return { name: "home", selectedTags: [] };
  if (parts[0] === "tag" && parts.length >= 2) {
    const selectedTags = parts[1]
      .split("+")
      .map((s) => {
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      })
      .filter(Boolean);
    return { name: "home", selectedTags };
  }
  if (parts[0] === "about") return { name: "about" };
  if (parts[0] === "eval" && parts.length === 2) {
    return { name: "eval", evalSlug: parts[1] };
  }
  if (parts[0] === "eval" && parts.length >= 3) {
    return { name: "solution", evalSlug: parts[1], solutionSlug: parts[2] };
  }
  return { name: "home", selectedTags: [] };
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
      const iconSlot = harnessIconSlot(sol.harness, ui.harnessIconSlotSidebar);
      const badgeMarkup = iconSlot
        ? iconSlot
        : `<span class="sidebar-badge">${esc(shortHarness)}</span>`;
      items.push(
        `<a href="#/eval/${esc(ev.slug)}/${esc(sol.slug)}"
            class="sidebar-link ${solActive ? "active" : ""}"
            title="${esc(sol.slug)} · ${esc(sol.harness)}/${esc(sol.model)}">
           ${badgeMarkup}
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

/** One solution row: same markup on the eval “Solutions” list and solution-page “Other solutions”. */
function solutionRowHtml(ev, sol) {
  const htmlOut = siteArtifactUrl(sol.artifactUrl);
  const htmlBtn = htmlOut
    ? `<a href="${esc(htmlOut)}" target="_blank" rel="noopener" class="${ui.btnOutlineXs}">
         <svg xmlns="http://www.w3.org/2000/svg" class="${ui.externalLinkIconXs}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
         HTML
       </a>`
    : "";
  const harnessSlot = harnessIconSlot(sol.harness, ui.harnessIconSlotSolutionRow);
  const metaBits = [
    harnessSlot ? "" : esc(sol.harness),
    esc(sol.model),
    sol.projectName ? `project ${esc(sol.projectName)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const firstTech = (sol.tech && sol.tech[0]) || "";
  const techBadge = firstTech
    ? `<span class="${ui.badgeOutlineTech}" title="${esc(firstTech)}">${esc(firstTech)}</span>`
    : "";
  return `
    <div class="${ui.solutionRowOuter}">
      <a href="#/eval/${esc(ev.slug)}/${esc(sol.slug)}" class="${ui.solutionRowMain}">
        ${techBadge}
        ${harnessSlot}
        <span class="${ui.solutionRowSlug}">${esc(sol.slug)}</span>
        <span class="${ui.metaMono}">${metaBits}</span>
        <span class="${ui.summaryLine}" title="${esc(sol.summary || "")}">${esc(sol.summary || "")}</span>
      </a>
      <div class="${ui.solutionRowRail}">
        ${htmlBtn}
        ${statusBadge(sol.outcome?.status)}
      </div>
    </div>`;
}

function viewHome(route) {
  const data = state.data;
  const selectedTags = route.selectedTags || [];
  const selectedSet = new Set(selectedTags);

  const totalSolutions = data.evals.reduce((n, e) => n + e.solutions.length, 0);
  const passed = data.evals.reduce(
    (n, e) => n + e.solutions.filter((s) => s.outcome?.status === "passed").length,
    0
  );

  const allTagSet = new Set();
  for (const ev of data.evals) {
    for (const t of ev.tags || []) allTagSet.add(t);
  }
  const allTagsSorted = [...allTagSet].sort((a, b) => a.localeCompare(b));

  const evalMatches = (ev) => {
    if (selectedSet.size === 0) return true;
    const evTags = new Set(ev.tags || []);
    for (const t of selectedSet) {
      if (evTags.has(t)) return true;
    }
    return false;
  };
  const filteredEvals = data.evals.filter(evalMatches);

  const tagFilterBar =
    allTagsSorted.length === 0
      ? ""
      : `<div id="eval-tag-filter" class="mb-4 rounded-xl border border-base-300 bg-base-200/80 p-3 sm:p-4" role="group" aria-label="Filter evals by tag">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <span class="text-sm font-medium text-base-content/80">Filter by tag</span>
            <span class="text-xs text-base-content/50">Showing evals that match <strong>any</strong> selected tag.</span>
          </div>
          <div class="flex flex-wrap gap-2">
            ${allTagsSorted
              .map((t) => {
                const on = selectedSet.has(t);
                return `<button type="button" data-tag-toggle="${esc(t)}" class="btn btn-sm min-h-8 h-8 px-3 font-normal normal-case ${
                  on ? "btn-primary" : "btn-ghost border border-base-300 hover:border-primary/40"
                }">${esc(t)}</button>`;
              })
              .join("")}
          </div>
          ${
            selectedSet.size
              ? `<div class="mt-3 flex flex-wrap items-center gap-2">
                   <button type="button" data-tag-clear class="btn btn-xs btn-ghost">Clear all filters</button>
                 </div>`
              : ""
          }
        </div>`;

  const evalCards = filteredEvals
    .map((ev) => {
      const tags = (ev.tags || [])
        .map((t) => `<span class="${ui.badgeGhostSm}">${esc(t)}</span>`)
        .join(" ");
      return `
        <a href="#/eval/${esc(ev.slug)}" class="${ui.cardHover}">
          <div class="card-body gap-3">
            <div class="flex items-start justify-between gap-3">
              <h3 class="${ui.cardTitleLg}">${esc(ev.title)}</h3>
              <span class="${ui.badgePrimarySm}">${ev.solutions.length} solution${ev.solutions.length === 1 ? "" : "s"}</span>
            </div>
            <p class="text-sm ${ui.muted}">${esc(ev.tagline || ev.description || "")}</p>
            <div class="flex flex-wrap gap-1.5 mt-1">${tags}</div>
          </div>
        </a>`;
    })
    .join("");

  const emptyFilterMsg =
    selectedSet.size > 0 && filteredEvals.length === 0
      ? `<div class="alert alert-warning mb-4" role="status">
           <span>No eval matches these tags. Try fewer tags or <button type="button" data-tag-clear class="link link-primary font-semibold">clear filters</button>.</span>
         </div>`
      : "";

  const evalSubline =
    selectedSet.size > 0
      ? ` · ${filteredEvals.length}/${data.evals.length} eval${data.evals.length === 1 ? "" : "s"} shown`
      : "";

  updateHeaderBreadcrumbs("");

  state.view.innerHTML = `
    <section class="${ui.heroHome}">
      <div class="${ui.heroContent}">
        <div class="max-w-3xl">
          <div class="${ui.badgeRowHero}">
            <span class="${ui.badgePrimaryOutline}">v0</span>
            <span class="${ui.badgeGhost}">${data.evals.length} eval${data.evals.length === 1 ? "" : "s"}</span>
            <span class="${ui.badgeGhost}">${totalSolutions} submission${totalSolutions === 1 ? "" : "s"}</span>
          </div>
          <div class="${ui.flexTitleRow}">
            <span
              class="${ui.heroEmoji}"
              aria-hidden="true"
              >🧠</span
            >
            <h1 class="${ui.heroTitle}">
              galaxy-brain
            </h1>
          </div>
          <p class="${ui.muted} mt-3 text-lg">
            A collection of agent evals. Each eval is a prompt; each solution is one
            harness/model pair's attempt. Browse them below.
          </p>
          <div class="${ui.stackGapHero}">
            <a id="hero-repo" class="${ui.btnGhostHero}" target="_blank" rel="noopener">
              ${githubLogoSvg()}
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div class="${ui.sectionHeadBaseline}">
        <h2 class="${ui.sectionTitle}">Evals</h2>
        <span class="${ui.mutedSm}">${passed}/${totalSolutions} passed${evalSubline}</span>
      </div>
      ${tagFilterBar}
      ${emptyFilterMsg}
      <div class="${ui.gridEvals}">${evalCards}</div>
    </section>
  `;

  document.getElementById("hero-repo").href = repoUrls(data).repo;

  if (!state.homeTagFilterClickBound) {
    state.homeTagFilterClickBound = true;
    state.view.addEventListener("click", (e) => {
      const filterRoot = e.target.closest("#eval-tag-filter");
      const inEmpty = e.target.closest(".alert-warning");
      if (!filterRoot && !inEmpty) return;
      if (e.target.closest("[data-tag-clear]")) {
        navigate("#/");
        return;
      }
      const btn = e.target.closest("[data-tag-toggle]");
      if (!btn || !filterRoot?.contains(btn)) return;
      const tag = btn.getAttribute("data-tag-toggle");
      if (tag == null) return;
      const r = parseHash();
      if (r.name !== "home" || !Array.isArray(r.selectedTags)) return;
      const nextSet = new Set(r.selectedTags || []);
      if (nextSet.has(tag)) nextSet.delete(tag);
      else nextSet.add(tag);
      navigate(homeHashFromTags([...nextSet]));
    });
  }
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
      <li class="${ui.aboutResourceCard}">
        <a href="${esc(c.href)}" class="link link-primary font-semibold" target="_blank" rel="noopener">${esc(c.title)}</a>
        <p class="text-sm text-base-content/75 mt-2 mb-0">${esc(c.blurb)}</p>
      </li>`
    )
    .join("");

  state.view.innerHTML = `
    <nav class="${ui.aboutCrumbs}">
      <ul>
        <li><a href="#/">Overview</a></li>
        <li class="${ui.crumbCurrent}">About</li>
      </ul>
    </nav>

    <article class="prose prose-sm max-w-none">
      <h1 class="${ui.proseAboutH1}">About galaxy-brain</h1>
      <p class="${ui.muted80}">
        This repo is a <strong>personal</strong> set of evals: prompts and tasks I care about, know well, and can judge consistently.
        The site is for <strong>comparing submissions side by side</strong> and <strong>tracking how outcomes change over time</strong> as models and harnesses improve.
      </p>
      <p class="${ui.muted80}">
        People can send <strong>pull requests</strong> with solutions; I run the evals myself (including open-ended or subjective parts) rather than outsourcing scoring to a crowd or an automated metric alone.
        That keeps the bar aligned with what I actually want from agents—not only what is easy to grade automatically.
      </p>

      <h2 class="${ui.proseAboutH2}">Comparable efforts (larger or different in spirit)</h2>
      <p class="${ui.muted80}">
        If you are looking for <em>large-scale subjective</em> or “quality in the wild” comparisons, these are well-known references. They differ from this project in scale and governance, but they answer a similar “which model feels better on hard tasks?” question.
      </p>
      <ul class="list-none pl-0 space-y-3 not-prose max-w-3xl">${listItems}</ul>

      <h2 class="${ui.proseAboutH2}">Source</h2>
      <p class="${ui.muted80}">
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
    .map((t) => `<span class="${ui.badgeGhostSm}">${esc(t)}</span>`)
    .join(" ");

  const solRows =
    ev.solutions.length === 0
      ? `<div class="alert">No solutions submitted yet.</div>`
      : ev.solutions.map((s) => solutionRowHtml(ev, s)).join("");

  updateHeaderBreadcrumbs(`
    <nav class="${ui.crumbsWrap}">
      <ul class="${ui.crumbsUl}">
        <li class="${ui.crumbLi}"><a href="#/">Overview</a></li>
        <li class="${ui.crumbCurrentTrunc}">${esc(ev.title)}</li>
      </ul>
    </nav>
  `);

  state.view.innerHTML = `
    <header class="${ui.sectionSm}">
      <div class="${ui.flexGapTag}">
        ${tags}
      </div>
      <h1 class="${ui.pageTitle}">${esc(ev.title)}</h1>
      <p class="${ui.muted} mt-2 max-w-3xl">${esc(ev.description || ev.tagline || "")}</p>
      <div class="${ui.stackGapBtn}">
        <a
          class="${ui.btnPrimarySmGithub}"
          href="${esc(urls.tree(ev.slug))}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View this eval's files on GitHub"
        >
          ${githubLogoSvg("w-4 h-4")}
          View on Github
        </a>
        <a class="${ui.btnGhostSm}" href="${esc(urls.blob(promptPath))}" target="_blank" rel="noopener">Edit prompt</a>
      </div>
    </header>

    <section class="${ui.sectionLg} w-full max-w-full min-w-0">
      <div class="${ui.sectionHead}">
        <h2 class="${ui.sectionTitle}">Solutions</h2>
        <span class="${ui.mutedSm}">${ev.solutions.length} total</span>
      </div>
      <div class="${ui.listColTight}">${solRows}</div>
    </section>

    <section>
      <div class="${ui.sectionHeadRow}">
        <h2 class="${ui.sectionTitle}">Prompt</h2>
        <span class="text-xs text-base-content/50 font-mono">${esc(promptPath)}</span>
      </div>
      <div class="relative ${ui.roundedPanel}">
        <div class="absolute top-3 right-3 z-10">
          <button
            type="button"
            id="prompt-copy-btn"
            class="${ui.btnPrimarySmCopy}"
            disabled
            aria-label="Copy prompt markdown to clipboard"
          >
            ${copyIconSvg("w-4 h-4")}
            <span class="prompt-copy-label font-semibold">Copy</span>
          </button>
        </div>
        <article id="prompt-md" class="${ui.prosePrompt}">
          <div class="${ui.loadingRow}">
            <span class="loading loading-dots loading-sm"></span>
            loading prompt…
          </div>
        </article>
      </div>
    </section>
  `;

  fetchMarkdown(urls.raw(promptPath)).then((md) => {
    const target = document.getElementById("prompt-md");
    const copyBtn = document.getElementById("prompt-copy-btn");
    if (!target) return;
    if (md == null) {
      target.innerHTML = `<p class="${ui.muted}">Couldn't load <code>${esc(promptPath)}</code>. <a class="link" target="_blank" rel="noopener" href="${esc(urls.blob(promptPath))}">Open on GitHub.</a></p>`;
      return;
    }
    target.innerHTML = renderMarkdown(md);
    if (!copyBtn) return;
    copyBtn.disabled = false;
    copyBtn.addEventListener("click", async () => {
      const ok = await copyTextToClipboard(md);
      const label = copyBtn.querySelector(".prompt-copy-label");
      if (!label) return;
      const prev = label.textContent;
      label.textContent = ok ? "Copied!" : "Copy failed";
      copyBtn.classList.remove(ui.btnPrimary);
      copyBtn.classList.add(ok ? ui.btnSuccess : ui.btnError);
      window.setTimeout(() => {
        label.textContent = prev;
        copyBtn.classList.remove(ui.btnSuccess, ui.btnError);
        copyBtn.classList.add(ui.btnPrimary);
      }, 2000);
    });
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
    .map((t) => `<span class="${ui.badgeOutlineSm}">${esc(t)}</span>`)
    .join(" ");

  const oc = sol.outcome || {};
  const deployedHtml = siteArtifactUrl(sol.artifactUrl);
  const harnessModelBadges = harnessModelBadgesHtml(sol);
  const hasArtifact = Boolean(sol.artifactUrl);
  const githubBtnClass = hasArtifact ? ui.btnOutlineSmGithub : ui.btnPrimarySmGithub;

  const otherSolutions = ev.solutions.filter((s) => s.slug !== sol.slug);
  const otherSolutionRows =
    otherSolutions.length === 0
      ? `<div class="alert">No other solutions for this eval.</div>`
      : otherSolutions.map((s) => solutionRowHtml(ev, s)).join("");

  updateHeaderBreadcrumbs(`
    <nav class="${ui.crumbsWrap}">
      <ul class="${ui.crumbsUl}">
        <li class="${ui.crumbLi}"><a href="#/">Overview</a></li>
        <li class="${ui.crumbLi}"><a href="#/eval/${esc(ev.slug)}">${esc(ev.title)}</a></li>
        <li class="${ui.crumbMonoTrunc}">${esc(sol.slug)}</li>
      </ul>
    </nav>
  `);

  state.view.innerHTML = `
    <header class="${ui.sectionMd}">
      <div class="${ui.flexGapBadge}">
        ${statusBadge(oc.status)}
        ${harnessModelBadges}
      </div>
      <h1 class="${ui.pageTitleMono}">${esc(sol.slug)}</h1>
      ${sol.projectName ? `<p class="${ui.muted} mt-1">project: <span class="font-mono">${esc(sol.projectName)}</span></p>` : ""}
      <p class="${ui.muted80} mt-3 max-w-3xl">${esc(sol.summary || "")}</p>
      <div class="${ui.stackGapBtn}">
        ${
          hasArtifact
            ? `<a class="${ui.btnPrimarySm} min-h-9 h-9" href="${esc(sol.artifactUrl)}" target="_blank" rel="noopener">Open artifact</a>`
            : ""
        }
        <a
          class="${githubBtnClass}"
          href="${esc(urls.tree(dirPath))}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View this solution's source files on GitHub"
        >
          ${githubLogoSvg("w-4 h-4")}
          View on Github
        </a>
        ${
          deployedHtml
            ? `<a class="${ui.btnOutlinePrimarySm}" href="${esc(deployedHtml)}" target="_blank" rel="noopener noreferrer" aria-label="Open the playable HTML output in a new tab">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                 Open HTML output
               </a>`
            : ""
        }
        <a class="${ui.btnGhostSm}" href="${esc(urls.blob(`${innerProject}/README.md`))}" target="_blank" rel="noopener">Open README</a>
      </div>
    </header>

    <section class="${ui.gridOutcome}">
      <div class="${ui.card} lg:col-span-2">
        <div class="card-body">
          <h2 class="${ui.cardTitleSm}">Outcome</h2>
          <div class="${ui.gridKv}">
            <div>
              <div class="${ui.kvLabel}">status</div>
              <div class="mt-1">${statusBadge(oc.status)}</div>
            </div>
            <div>
              <div class="${ui.kvLabel}">evaluated</div>
              <div class="mt-1 text-sm">${esc(oc.evaluatedAt || "—")}</div>
            </div>
            <div>
              <div class="${ui.kvLabel}">score</div>
              <div class="mt-1 text-sm">${oc.score == null ? "—" : esc(String(oc.score))}</div>
            </div>
            <div>
              <div class="${ui.kvLabel}">harness/model</div>
              <div class="${ui.harnessModelBadgesRow}">${harnessModelBadges}</div>
            </div>
          </div>
          ${
            oc.verdict
              ? `<div class="mt-4">
                  <div class="${ui.kvLabel} mb-1">verdict</div>
                  <p class="text-sm ${ui.muted85}">${esc(oc.verdict)}</p>
                </div>`
              : ""
          }
        </div>
      </div>

      <div class="${ui.card}">
        <div class="card-body">
          <h2 class="${ui.cardTitleSm}">Stack</h2>
          <div class="flex flex-wrap gap-1.5 mt-1">${tech || `<span class="${ui.emptyDash}">—</span>`}</div>
          ${
            sol.notes
              ? `<div class="mt-4">
                  <div class="${ui.kvLabel} mb-1">notes</div>
                  <p class="text-sm ${ui.muted80}">${esc(sol.notes)}</p>
                </div>`
              : ""
          }
        </div>
      </div>
    </section>

    <section class="${ui.sectionLg}">
      <div class="${ui.sectionHeadRow}">
        <h2 class="${ui.sectionTitle}">README</h2>
        <span id="readme-path" class="text-xs text-base-content/50 font-mono"></span>
      </div>
      <article id="solution-md" class="${ui.proseReadme}">
        <div class="${ui.loadingRow}">
          <span class="loading loading-dots loading-sm"></span>
          loading README…
        </div>
      </article>
    </section>

    <section class="${ui.sectionLg} w-full max-w-full min-w-0">
      <div class="${ui.sectionHead}">
        <h2 class="${ui.sectionTitle}">Other solutions for this eval</h2>
        <span class="${ui.mutedSm}">${otherSolutions.length} total</span>
      </div>
      <div class="${ui.listColTight}">${otherSolutionRows}</div>
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
      target.innerHTML = `<p class="${ui.muted}">No README found for this solution. <a class="link" target="_blank" rel="noopener" href="${esc(urls.tree(dirPath))}">Browse the directory.</a></p>`;
    }
  })();
}

function view404(msg) {
  updateHeaderBreadcrumbs("");
  state.view.innerHTML = `
    <div class="${ui.hero404}">
      <div class="hero-content text-center py-16">
        <div class="max-w-md">
          <h1 class="${ui.pageTitle}">Not found</h1>
          <p class="${ui.muted} mt-2">${esc(msg)}</p>
          <a href="#/" class="${ui.btnPrimarySmMt}">Back to overview</a>
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
    <li class="menu-title pt-2"><span class="${ui.themeGroupLabel}">${label}</span></li>
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
      return viewHome(route);
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
