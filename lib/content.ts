import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import rawData from "@/docs/data.json";

export type Outcome = {
  status?: string | null;
  verdict?: string | null;
  evaluatedAt?: string | null;
  score?: number | string | null;
};

export type Solution = {
  slug: string;
  harness: string;
  harnessShort?: string;
  model: string;
  projectName?: string;
  summary?: string;
  tech?: string[];
  submittedAt?: string;
  artifactUrl?: string;
  notes?: string;
  outcome?: Outcome;
};

export type Eval = {
  slug: string;
  title: string;
  tagline?: string;
  description?: string;
  tags?: string[];
  createdAt?: string;
  solutions: Solution[];
};

export type Repo = { owner: string; name: string; branch: string };
export type SiteData = { repo: Repo; evals: Eval[] };

const data = rawData as unknown as SiteData;
const repoRoot = process.cwd();

export function getData(): SiteData {
  return data;
}

export function getEvals(): Eval[] {
  return data.evals || [];
}

export function getEval(slug: string): Eval | undefined {
  return getEvals().find((e) => e.slug === slug);
}

export function getSolution(
  evalSlug: string,
  solutionSlug: string
): { ev: Eval; sol: Solution } | undefined {
  const ev = getEval(evalSlug);
  if (!ev) return undefined;
  const sol = ev.solutions.find((s) => s.slug === solutionSlug);
  if (!sol) return undefined;
  return { ev, sol };
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  for (const ev of getEvals()) for (const t of ev.tags || []) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/* ----- GitHub / artifact URL helpers ----- */

export function repoUrls(d: SiteData = data) {
  const { owner, name, branch } = d.repo;
  const base = `https://github.com/${owner}/${name}`;
  return {
    repo: base,
    branchTree: `${base}/tree/${branch}`,
    blob: (p: string) => `${base}/blob/${branch}/${p}`,
    tree: (p: string) => `${base}/tree/${branch}/${p}`,
  };
}

/** `./artifacts/<eval>/<harness-model>.html` -> `/artifacts/<eval>/<harness-model>` (served from /public). */
export function artifactHref(artifactUrl?: string | null): string | null {
  if (!artifactUrl) return null;
  // The deployed site uses clean URLs (Next.js static export on Vercel), the
  // same way `/eval/<slug>/<solution>` is served. A request to the artifact
  // *with* a `.html` suffix 404s; the file is exposed at the extension-less
  // path. Strip a trailing `.html` so the "Open HTML output" link and the
  // inline preview resolve in production.
  return (
    "/" + String(artifactUrl).replace(/^\.?\//, "").replace(/\.html$/i, "")
  );
}

/* ----- Markdown (rendered at build, sanitized) ----- */

function normalizeMarkdownForMarked(md: string): string {
  // Marked treats two-space sublists under ordered items as a new top-level
  // list; normalize that common README style first (ported from docs/app.js).
  return String(md ?? "").replace(
    /(^\d{1,9}[.)]\s+[^\n]*(?:\n|$))((?: {2}[-+*]\s+[^\n]*(?:\n|$))+)/gm,
    (_m, listItem: string, nestedList: string) =>
      `${listItem}${nestedList.replace(/^ {2}([-+*]\s+)/gm, "   $1")}`
  );
}

export function renderMarkdown(md: string): string {
  const html = marked.parse(normalizeMarkdownForMarked(md), {
    gfm: true,
    breaks: false,
    async: false,
  }) as string;
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "del",
    ]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "id"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["class", "id"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
  });
}

/** Read a repo-relative markdown file (build-time only). */
async function readMarkdown(mdPath: string): Promise<string | null> {
  const normalized = String(mdPath || "").replace(/^\/+/, "");
  if (!normalized.endsWith(".md")) return null;
  const filePath = path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    normalized
  );
  const rel = path.relative(repoRoot, filePath);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
}

export type MarkdownResult = { raw: string; html: string; path: string } | null;

/** The eval prompt: `<slug>/README.md`. */
export async function getEvalPrompt(ev: Eval): Promise<MarkdownResult> {
  const promptPath = `${ev.slug}/README.md`;
  const raw = await readMarkdown(promptPath);
  if (raw == null) return null;
  return { raw, html: renderMarkdown(raw), path: promptPath };
}

/** The solution README, trying `<eval>/<sol>/<project>/README.md` then `<eval>/<sol>/README.md`. */
export async function getSolutionReadme(
  ev: Eval,
  sol: Solution
): Promise<MarkdownResult> {
  const dirPath = `${ev.slug}/${sol.slug}`;
  const inner = sol.projectName ? `${dirPath}/${sol.projectName}` : dirPath;
  for (const candidate of [`${inner}/README.md`, `${dirPath}/README.md`]) {
    const raw = await readMarkdown(candidate);
    if (raw != null) return { raw, html: renderMarkdown(raw), path: candidate };
  }
  return null;
}
