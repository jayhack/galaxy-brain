import { firstEnv } from "./env.mjs";

/** Read a GitHub token from the usual env var names. */
export function githubToken() {
  return firstEnv("GITHUB_TOKEN", "GH_TOKEN", "GITHUB_PAT");
}

/**
 * Build an authenticated clone URL. The token is embedded so the sandbox can
 * both clone and push. The sandbox is ephemeral, so the credential dies with it.
 */
export function authedRemote({ owner, name, token }) {
  return `https://x-access-token:${token}@github.com/${owner}/${name}.git`;
}

/** Create a pull request via the GitHub REST API. */
export async function createPullRequest({
  owner,
  name,
  token,
  head,
  base,
  title,
  body,
  draft = true,
}) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, head, base, body, draft }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const message =
      json?.message +
      (json?.errors ? ` — ${JSON.stringify(json.errors)}` : "");
    const err = new Error(`GitHub PR creation failed (${res.status}): ${message}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return { url: json.html_url, number: json.number };
}
