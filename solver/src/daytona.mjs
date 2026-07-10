import { Daytona } from "@daytona/sdk";
import { firstEnv } from "./env.mjs";
import { createConsoleReporter } from "./reporter.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const defaultEmit = createConsoleReporter();

/** Construct a Daytona client from environment variables. */
export function makeDaytona() {
  const apiKey = firstEnv("DAYTONA_API_KEY");
  if (!apiKey) {
    throw new Error(
      "Missing DAYTONA_API_KEY. Add your Daytona credentials to the repo-root .env."
    );
  }
  const config = { apiKey };
  const apiUrl = firstEnv("DAYTONA_API_URL", "DAYTONA_SERVER_URL");
  const target = firstEnv("DAYTONA_TARGET");
  const organizationId = firstEnv("DAYTONA_ORGANIZATION_ID", "DAYTONA_ORG_ID");
  if (apiUrl) config.apiUrl = apiUrl;
  if (target) config.target = target;
  if (organizationId) config.organizationId = organizationId;
  return new Daytona(config);
}

/**
 * Create a sandbox with full outbound internet access and the given env vars.
 */
export async function createSandbox(
  daytona,
  { envVars, snapshot, labels, emit = defaultEmit }
) {
  const createParams = {
    language: "typescript", // ensures node + npm are available out of the box
    envVars: envVars ?? {},
    autoStopInterval: 0, // never auto-stop mid-run
    labels: labels ?? {},
  };
  if (snapshot) createParams.snapshot = snapshot;

  const sandbox = await daytona.create(createParams);

  // Be explicit about full internet access (default, but make it deterministic
  // and recover from any inherited block / allow-list on the snapshot).
  try {
    await sandbox.updateNetworkSettings({ networkBlockAll: false });
  } catch (error) {
    emit("warn", `could not explicitly clear network restrictions: ${error.message}`);
  }

  return sandbox;
}

/** Resolve the sandbox working directory once. */
export async function getWorkDir(sandbox) {
  try {
    return await sandbox.getWorkDir();
  } catch {
    try {
      return await sandbox.getUserHomeDir();
    } catch {
      return "~";
    }
  }
}

/**
 * Run a command and wait for it to finish. Prints stdout/stderr. Throws on a
 * non-zero exit unless `allowFailure` is set.
 */
export async function exec(
  sandbox,
  command,
  {
    cwd,
    timeoutSec = 900,
    display,
    quiet = false,
    allowFailure = false,
    emit = defaultEmit,
  } = {}
) {
  if (!quiet) emit("cmd", display ?? command);
  const res = await sandbox.process.executeCommand(
    command,
    cwd,
    undefined,
    timeoutSec
  );
  const output = res.result ?? res.artifacts?.stdout ?? "";
  if (output && !quiet) emit("stdout", output.endsWith("\n") ? output : output + "\n");
  if (res.exitCode !== 0 && !allowFailure) {
    throw new Error(
      `Command failed (exit ${res.exitCode}): ${display ?? command}`
    );
  }
  return { exitCode: res.exitCode, output };
}

/**
 * Write a UTF-8 file into the sandbox without any shell-escaping headaches by
 * base64-encoding the content locally and decoding it inside the sandbox.
 */
export async function writeFileInSandbox(
  sandbox,
  remotePath,
  content,
  { cwd, emit = defaultEmit } = {}
) {
  const b64 = Buffer.from(content, "utf8").toString("base64");
  const dir = remotePath.replace(/\/[^/]*$/, "");
  const mkdir = dir && dir !== remotePath ? `mkdir -p "${dir}" && ` : "";
  await exec(
    sandbox,
    `${mkdir}printf '%s' '${b64}' | base64 -d > "${remotePath}"`,
    { cwd, display: `write ${remotePath}`, quiet: true, emit }
  );
}

/**
 * Run a long-lived command in a background session and stream its logs live.
 * Returns the command's exit code.
 */
export async function execStream(
  sandbox,
  command,
  { cwd, timeoutSec = 3600, display, emit = defaultEmit } = {}
) {
  emit("cmd", display ?? command);
  const sessionId = `solve-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  await sandbox.process.createSession(sessionId);

  const fullCommand = cwd ? `cd "${cwd}" && ${command}` : command;

  try {
    const started = await sandbox.process.executeSessionCommand(sessionId, {
      command: fullCommand,
      runAsync: true,
    });
    const cmdId = started.cmdId;

    // Stream logs as they arrive. This resolves once the command completes.
    const streaming = sandbox.process
      .getSessionCommandLogs(
        sessionId,
        cmdId,
        (chunk) => emit("stdout", chunk),
        (chunk) => emit("stderr", chunk)
      )
      .catch((error) => {
        emit("warn", `log stream interrupted: ${error.message}`);
      });

    const deadline = Date.now() + timeoutSec * 1000;
    let cmd = await sandbox.process.getSessionCommand(sessionId, cmdId);
    while (cmd.exitCode === undefined || cmd.exitCode === null) {
      if (Date.now() > deadline) {
        throw new Error(
          `Agent run exceeded timeout of ${timeoutSec}s. The sandbox is left running for inspection.`
        );
      }
      await sleep(3000);
      cmd = await sandbox.process.getSessionCommand(sessionId, cmdId);
    }

    await streaming;
    emit("stdout", "\n");
    return cmd.exitCode;
  } finally {
    await sandbox.process.deleteSession(sessionId).catch(() => {});
  }
}
