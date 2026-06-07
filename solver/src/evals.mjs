import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "./env.mjs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Normalize an arbitrary label (e.g. a model name) into a kebab-case slug. */
export function toSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isSlug(value) {
  return typeof value === "string" && SLUG_RE.test(value);
}

/** Read docs/data.json (registry of evals + solutions). */
export async function readRegistry() {
  const dataPath = path.join(repoRoot, "docs", "data.json");
  return JSON.parse(await readFile(dataPath, "utf8"));
}

/** Resolve an eval by slug: confirm folder + README exist and load the prompt. */
export async function loadEval(slug) {
  if (!isSlug(slug)) {
    throw new Error(`Eval slug must be lowercase kebab-case, got "${slug}".`);
  }
  const dir = path.join(repoRoot, slug);
  const readmePath = path.join(dir, "README.md");
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) throw new Error("not a directory");
  } catch {
    throw new Error(
      `Eval folder "${slug}/" not found at ${dir}. Run \`solve evals\` to list available evals.`
    );
  }
  let prompt;
  try {
    prompt = await readFile(readmePath, "utf8");
  } catch {
    throw new Error(`Eval "${slug}" is missing a prompt at ${slug}/README.md.`);
  }

  let registryEntry;
  try {
    const registry = await readRegistry();
    registryEntry = registry.evals?.find((e) => e.slug === slug);
  } catch {
    registryEntry = undefined;
  }

  return { slug, dir, readmePath, prompt, registryEntry };
}

/**
 * List evals from the registry (docs/data.json — the source of truth) and note
 * whether each one's folder + prompt exist on disk.
 */
export async function listEvals() {
  let registry;
  try {
    registry = await readRegistry();
  } catch {
    registry = { evals: [] };
  }

  const results = [];
  for (const reg of registry.evals || []) {
    if (!isSlug(reg.slug)) continue;
    let hasFolder = false;
    try {
      await stat(path.join(repoRoot, reg.slug, "README.md"));
      hasFolder = true;
    } catch {
      hasFolder = false;
    }
    results.push({
      slug: reg.slug,
      registered: true,
      hasFolder,
      title: reg.title ?? reg.slug,
      tagline: reg.tagline ?? "",
      solutions: reg.solutions?.length ?? 0,
    });
  }
  return results.sort((a, b) => a.slug.localeCompare(b.slug));
}
