import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "docs", "data.json");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function exists(repoRelativePath) {
  try {
    await access(path.join(root, repoRelativePath));
    return true;
  } catch {
    return false;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkSlug(slug, label) {
  if (typeof slug !== "string" || !slugPattern.test(slug)) {
    fail(`${label} must be lowercase kebab-case, got ${JSON.stringify(slug)}`);
  }
}

function publicArtifactPath(artifactUrl) {
  if (typeof artifactUrl !== "string") return null;
  const match = artifactUrl.match(/^\.\/artifacts\/([^/]+)\/([^/]+\.html)$/);
  if (!match) return null;
  return path.posix.join("public", "artifacts", match[1], match[2]);
}

let data;
try {
  data = JSON.parse(await readFile(dataPath, "utf8"));
} catch (error) {
  fail(`Could not parse docs/data.json: ${error.message}`);
}

if (data) {
  if (!isObject(data.repo)) {
    fail("docs/data.json must include a repo object");
  }

  if (!Array.isArray(data.evals)) {
    fail("docs/data.json must include an evals array");
  } else {
    const evalSlugs = new Set();

    for (const ev of data.evals) {
      if (!isObject(ev)) {
        fail("Each eval entry must be an object");
        continue;
      }

      const evalLabel = `eval ${JSON.stringify(ev.slug)}`;
      checkSlug(ev.slug, `${evalLabel} slug`);

      if (evalSlugs.has(ev.slug)) {
        fail(`${evalLabel} is duplicated in docs/data.json`);
      }
      evalSlugs.add(ev.slug);

      if (!(await exists(ev.slug))) {
        fail(`${evalLabel} is missing folder ${ev.slug}/`);
      }

      if (!(await exists(path.posix.join(ev.slug, "README.md")))) {
        fail(`${evalLabel} is missing prompt README at ${ev.slug}/README.md`);
      }

      if (!Array.isArray(ev.solutions)) {
        fail(`${evalLabel} must include a solutions array`);
        continue;
      }

      const solutionSlugs = new Set();
      for (const sol of ev.solutions) {
        if (!isObject(sol)) {
          fail(`${evalLabel} has a non-object solution entry`);
          continue;
        }

        const solutionLabel = `${ev.slug}/${sol.slug}`;
        checkSlug(sol.slug, `solution ${solutionLabel} slug`);

        if (solutionSlugs.has(sol.slug)) {
          fail(`solution ${solutionLabel} is duplicated within ${ev.slug}`);
        }
        solutionSlugs.add(sol.slug);

        if (!sol.harness) fail(`solution ${solutionLabel} is missing harness`);
        if (!sol.model) fail(`solution ${solutionLabel} is missing model`);

        const solutionDir = path.posix.join(ev.slug, sol.slug);
        if (!(await exists(solutionDir))) {
          fail(`solution ${solutionLabel} is missing folder ${solutionDir}/`);
        }

        const readmeCandidates = [
          path.posix.join(solutionDir, "README.md"),
          sol.projectName
            ? path.posix.join(solutionDir, sol.projectName, "README.md")
            : null,
        ].filter(Boolean);

        const hasReadme = (
          await Promise.all(readmeCandidates.map((candidate) => exists(candidate)))
        ).some(Boolean);
        if (!hasReadme) {
          fail(
            `solution ${solutionLabel} is missing README.md in ${solutionDir}/` +
              (sol.projectName ? ` or ${solutionDir}/${sol.projectName}/` : "")
          );
        }

        if (sol.artifactUrl) {
          const artifactPath = publicArtifactPath(sol.artifactUrl);
          if (!artifactPath) {
            fail(
              `solution ${solutionLabel} artifactUrl must look like ` +
                `"./artifacts/${ev.slug}/${sol.slug}.html"`
            );
          } else {
            const expected = path.posix.join(
              "public",
              "artifacts",
              ev.slug,
              `${sol.slug}.html`
            );
            if (artifactPath !== expected) {
              warn(
                `solution ${solutionLabel} artifact is ${artifactPath}; ` +
                  `expected ${expected} for predictable previews`
              );
            }
            if (!(await exists(artifactPath))) {
              fail(`solution ${solutionLabel} artifact file is missing: ${artifactPath}`);
            }
          }
        }
      }
    }
  }
}

for (const message of warnings) {
  console.warn(`Warning: ${message}`);
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("Content validation passed.");
