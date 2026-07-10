/**
 * Build the instruction prompt handed to the coding agent inside the sandbox.
 *
 * The orchestrator has already cloned the repo and checked out a fresh branch,
 * so the agent's job is purely to author the solution following the repo's
 * submission conventions (see AGENTS.md). The orchestrator handles staging,
 * committing, pushing, and opening the pull request afterwards.
 */
export function buildPrompt({
  evalSlug,
  evalPrompt,
  solutionSlug,
  harnessLabel,
  harnessId,
  model,
  repoDir,
}) {
  const solutionDir = `${evalSlug}/${solutionSlug}`;
  const artifactPath = `public/artifacts/${evalSlug}/${solutionSlug}.html`;

  return `You are an autonomous coding agent (${harnessLabel}${
    model ? `, model: ${model}` : ""
  }) attempting an eval in the "galaxy-brain" repository.

The repository is already cloned at ${repoDir} and checked out on a fresh
solution branch. Do ALL of your work inside that repository. You have full
internet access — research, fetch assets, and use any tools you need.

# Your assignment

Implement a complete, high-quality solution to the eval below and lay it out
exactly the way this repo expects so it can be submitted as a pull request.

Identity for this submission:
- Eval slug:      ${evalSlug}
- Harness:        ${harnessId}
- Model:          ${model || "(harness default)"}
- Solution slug:  ${solutionSlug}
- Solution dir:   ${solutionDir}/

# The eval prompt (${evalSlug}/README.md)

----------------------------------------------------------------------
${evalPrompt.trim()}
----------------------------------------------------------------------

# Submission conventions (follow these precisely)

1. Put every solution source file inside ${solutionDir}/. Do not create files
   anywhere else in the repo except the two registry/artifact touch-points below.
2. Add ${solutionDir}/README.md describing: what you built, how to run or open
   it from a fresh clone, any required environment variables, and the single
   best file or command an evaluator should use.
3. Register the solution in docs/data.json: find the eval object whose "slug"
   is "${evalSlug}" and append an object to its "solutions" array with at least:
   {
     "slug": "${solutionSlug}",
     "harness": "${harnessId}",
     "model": ${JSON.stringify(model || harnessId)},
     "summary": "<one or two sentence summary of what you built>",
     "tech": ["<key technologies>"],
     "submittedAt": "<today's date as YYYY-MM-DD>",
     "outcome": { "status": "submitted", "verdict": null, "evaluatedAt": null, "score": null }
   }
   Keep the JSON valid and match the indentation/style already in the file.
4. If the eval asks for a browsable single-file HTML deliverable, also copy the
   published mirror to ${artifactPath} and add
   "artifactUrl": "./artifacts/${evalSlug}/${solutionSlug}.html" to your
   solution object in docs/data.json.
5. Validate your work before finishing by running, from ${repoDir}:
     node scripts/validate-content.mjs
   Fix any errors it reports. (This script only uses Node built-ins, so it runs
   without installing dependencies.)

# Rules

- Only modify files under ${solutionDir}/, docs/data.json, and (if needed)
  ${artifactPath}. Do NOT edit the eval prompt, other solutions, the Next.js
  site, or unrelated tooling.
- Do NOT run git commit, git push, or open a pull request — the harness does
  that for you automatically once you are done. Just leave your changes in the
  working tree.
- Aim for a genuinely good, complete submission that satisfies the eval's
  acceptance criteria, not a stub.

When you are finished, briefly summarize what you built and which files you
created or changed.`;
}
