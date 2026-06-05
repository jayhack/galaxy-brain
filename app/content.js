import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const dataPath = path.join(repoRoot, "docs", "data.json");
const safeMarkdownRoots = [repoRoot];

export async function readEvalData() {
  const data = await readFile(dataPath, "utf8");
  return JSON.parse(data);
}

export async function readMarkdownFile(markdownPath) {
  const normalizedPath = String(markdownPath || "").replace(/^\/+/, "");
  if (!normalizedPath.endsWith(".md")) return null;

  const filePath = path.resolve(repoRoot, normalizedPath);
  const isSafePath = safeMarkdownRoots.some((root) => {
    const relativePath = path.relative(root, filePath);
    return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
  });
  if (!isSafePath) return null;

  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function solutionReadmeCandidates(evalSlug, solution) {
  const dirPath = `${evalSlug}/${solution.slug}`;
  const innerProject = solution.projectName ? `${dirPath}/${solution.projectName}` : dirPath;
  return [`${innerProject}/README.md`, `${dirPath}/README.md`];
}

export async function buildStaticSitePayload() {
  const data = await readEvalData();
  const markdown = {};

  for (const ev of data.evals || []) {
    const promptPath = `${ev.slug}/README.md`;
    const promptMarkdown = await readMarkdownFile(promptPath);
    if (promptMarkdown != null) markdown[promptPath] = promptMarkdown;

    for (const solution of ev.solutions || []) {
      for (const readmePath of solutionReadmeCandidates(ev.slug, solution)) {
        if (markdown[readmePath] != null) continue;
        const readmeMarkdown = await readMarkdownFile(readmePath);
        if (readmeMarkdown != null) markdown[readmePath] = readmeMarkdown;
      }
    }
  }

  return { data, markdown };
}
