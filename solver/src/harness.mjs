/**
 * Registry of supported coding-agent harnesses.
 *
 * Each harness knows:
 *  - how to install its CLI inside a fresh Linux sandbox,
 *  - which API key env var it needs (read locally, forwarded into the sandbox),
 *  - how to invoke it non-interactively with a prompt and (optional) model.
 *
 * The prompt is always passed as a single shell argument via `"$(cat <file>)"`.
 * Command substitution output is NOT re-parsed by the shell, so arbitrary
 * prompt content (quotes, backticks, $, newlines) is passed through verbatim.
 */

const PATH_PREFIX = 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH";';

/** Quote a value for safe use inside a double-quoted shell string. */
function shellModelFlag(flag, model) {
  if (!model) return "";
  return ` ${flag} "${String(model).replace(/(["\\$`])/g, "\\$1")}"`;
}

export const HARNESSES = {
  codex: {
    id: "codex",
    label: "OpenAI Codex CLI",
    bin: "codex",
    defaultModel: "gpt-5-codex",
    // Local env names checked, then forwarded into the sandbox under the
    // canonical name the CLI expects.
    apiKey: { sandboxVar: "OPENAI_API_KEY", aliases: ["OPENAI_API_KEY"] },
    install: ["npm install -g @openai/codex@latest"],
    versionCommand: `${PATH_PREFIX} codex --version`,
    buildRunCommand({ model, promptPath }) {
      // `codex exec` runs non-interactively. The bypass flag disables both the
      // approval gate and the internal sandbox -- appropriate because we are
      // already inside a disposable Daytona microVM with full internet.
      return (
        `${PATH_PREFIX} codex exec --dangerously-bypass-approvals-and-sandbox` +
        `${shellModelFlag("--model", model)} --skip-git-repo-check "$(cat ${promptPath})"`
      );
    },
  },

  cursor: {
    id: "cursor",
    label: "Cursor CLI (cursor-agent)",
    bin: "cursor-agent",
    defaultModel: undefined, // cursor-agent picks a sensible default when omitted
    apiKey: { sandboxVar: "CURSOR_API_KEY", aliases: ["CURSOR_API_KEY"] },
    install: ["curl https://cursor.com/install -fsS | bash"],
    versionCommand: `${PATH_PREFIX} cursor-agent --version`,
    buildRunCommand({ model, promptPath }) {
      // -p = print/non-interactive, --force = allow file + shell mutations,
      // --trust = don't prompt about the workspace in headless mode.
      return (
        `${PATH_PREFIX} cursor-agent -p --force --trust --output-format text` +
        `${shellModelFlag("--model", model)} "$(cat ${promptPath})"`
      );
    },
  },

  claude: {
    id: "claude",
    label: "Claude Code CLI",
    bin: "claude",
    defaultModel: "sonnet",
    apiKey: { sandboxVar: "ANTHROPIC_API_KEY", aliases: ["ANTHROPIC_API_KEY"] },
    install: ["npm install -g @anthropic-ai/claude-code@latest"],
    versionCommand: `${PATH_PREFIX} claude --version`,
    buildRunCommand({ model, promptPath }) {
      // -p = print/headless, --dangerously-skip-permissions = no approval gate.
      return (
        `${PATH_PREFIX} claude -p --dangerously-skip-permissions` +
        `${shellModelFlag("--model", model)} "$(cat ${promptPath})"`
      );
    },
  },
};

export function getHarness(id) {
  const harness = HARNESSES[id];
  if (!harness) {
    const known = Object.keys(HARNESSES).join(", ");
    throw new Error(`Unknown harness "${id}". Supported harnesses: ${known}.`);
  }
  return harness;
}

export function listHarnesses() {
  return Object.values(HARNESSES);
}
