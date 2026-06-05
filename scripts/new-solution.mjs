import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "docs", "data.json");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function usage() {
  console.error(`Usage:
  npm run new:solution -- <eval-slug> <solution-slug> --harness <harness> --model <model> [options]

Options:
  --project-name <name>  Add projectName to docs/data.json
  --summary <text>       Add a short solution summary
  --tech <a,b,c>         Add comma-separated tech labels
  --artifact             Add artifactUrl and create public/artifacts/<eval>/<solution>.html

Example:
  npm run new:solution -- evading-demons cursor-gpt-5-5-high --harness cursor --model gpt-5-5-high --artifact
`);
  process.exit(1);
}

function parseArgs(argv) {
  const [evalSlug, solutionSlug, ...rest] = argv;
  if (!evalSlug || !solutionSlug) usage();

  const options = {
    evalSlug,
    solutionSlug,
    artifact: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--artifact") {
      options.artifact = true;
      continue;
    }

    const next = rest[index + 1];
    if (!next || next.startsWith("--")) usage();

    if (arg === "--harness") options.harness = next;
    else if (arg === "--model") options.model = next;
    else if (arg === "--project-name") options.projectName = next;
    else if (arg === "--summary") options.summary = next;
    else if (arg === "--tech") {
      options.tech = next
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      usage();
    }
    index += 1;
  }

  if (!options.harness || !options.model) usage();
  return options;
}

function assertSlug(slug, label) {
  if (!slugPattern.test(slug)) {
    console.error(`${label} must be lowercase kebab-case: ${slug}`);
    process.exit(1);
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readmeTemplate({ evalSlug, solutionSlug, harness, model, artifact }) {
  const artifactLine = artifact
    ? `\n## Artifact\n\nThe mirrored Vercel artifact path is:\n\n\`public/artifacts/${evalSlug}/${solutionSlug}.html\`\n`
    : "";

  return `# ${solutionSlug}

Solution for \`${evalSlug}\`.

## Harness / model

- Harness: \`${harness}\`
- Model: \`${model}\`

## What I built

TODO: summarize the implementation and key tradeoffs.

## How to run or open

TODO: provide the exact command or file path a fresh evaluator should use.
${artifactLine}
## Notes

TODO: mention any dependencies, environment variables, limitations, or evaluation notes.
`;
}

const options = parseArgs(process.argv.slice(2));
assertSlug(options.evalSlug, "eval slug");
assertSlug(options.solutionSlug, "solution slug");

const data = JSON.parse(await readFile(dataPath, "utf8"));
const ev = data.evals?.find((entry) => entry.slug === options.evalSlug);
if (!ev) {
  console.error(`Could not find eval ${options.evalSlug} in docs/data.json`);
  process.exit(1);
}

ev.solutions ??= [];
if (ev.solutions.some((solution) => solution.slug === options.solutionSlug)) {
  console.error(
    `Solution ${options.evalSlug}/${options.solutionSlug} already exists in docs/data.json`
  );
  process.exit(1);
}

const solutionDir = path.join(root, options.evalSlug, options.solutionSlug);
await mkdir(solutionDir, { recursive: false });

const readmePath = path.join(solutionDir, "README.md");
await writeFile(readmePath, readmeTemplate(options), { flag: "wx" });

const solution = {
  slug: options.solutionSlug,
  harness: options.harness,
  model: options.model,
  summary: options.summary ?? "TODO: summarize this solution.",
  tech: options.tech ?? [],
  submittedAt: today(),
  outcome: {
    status: "submitted",
    verdict: null,
    evaluatedAt: null,
    score: null,
  },
};

if (options.projectName) {
  solution.projectName = options.projectName;
}

if (options.artifact) {
  solution.artifactUrl = `./artifacts/${options.evalSlug}/${options.solutionSlug}.html`;
  const artifactPath = path.join(
    root,
    "public",
    "artifacts",
    options.evalSlug,
    `${options.solutionSlug}.html`
  );
  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(
    artifactPath,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${options.evalSlug} / ${options.solutionSlug}</title>
  </head>
  <body>
    <p>Replace this placeholder with the submitted HTML artifact.</p>
  </body>
</html>
`,
    { flag: "wx" }
  );
}

ev.solutions.push(solution);
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(`Created ${path.relative(root, solutionDir)}/`);
console.log(`Updated ${path.relative(root, dataPath)}`);
if (options.artifact) {
  console.log(
    `Created public/artifacts/${options.evalSlug}/${options.solutionSlug}.html`
  );
}
