/**
 * A "reporter" is just a function `emit(type, payload)` that the orchestrator
 * and sandbox helpers call instead of writing to the console directly. This
 * lets the same run logic drive either the terminal (CLI) or a live browser
 * dashboard (SSE) without any conditional logging sprinkled through the code.
 *
 * Event types:
 *   step    - high-level stage banner (string)
 *   cmd     - a shell command about to run (string)
 *   stdout  - raw stdout chunk from the sandbox (string, may lack newline)
 *   stderr  - raw stderr chunk from the sandbox (string)
 *   info    - informational line (string)
 *   warn    - warning line (string)
 *   error   - error line (string)
 *   plan    - dry-run plan / prompt text (string)
 *   status  - structured phase marker, e.g. { phase: "agent", sandboxId } (object)
 *   result  - structured final result (object)
 *   done    - terminal marker; payload { ok: boolean } (object)
 */

export function createConsoleReporter() {
  return function emit(type, payload) {
    switch (type) {
      case "step":
        process.stdout.write(`\n\u25B8 ${payload}\n`);
        break;
      case "cmd":
        process.stdout.write(`\n$ ${payload}\n`);
        break;
      case "stdout":
      case "plan":
        process.stdout.write(payload);
        break;
      case "stderr":
        process.stderr.write(payload);
        break;
      case "info":
        process.stdout.write(`${payload}\n`);
        break;
      case "warn":
        process.stderr.write(`Warning: ${payload}\n`);
        break;
      case "error":
        process.stderr.write(`Error: ${payload}\n`);
        break;
      case "status":
      case "result":
      case "done":
        // Structured events; the CLI prints its own summary from the result.
        break;
      default:
        if (typeof payload === "string") process.stdout.write(`${payload}\n`);
    }
  };
}

/** A reporter that fans an event out to every registered listener. */
export function createEmitterReporter() {
  const listeners = new Set();
  const emit = (type, payload) => {
    for (const listener of listeners) {
      try {
        listener({ type, payload, t: Date.now() });
      } catch {
        /* a broken listener must not break the run */
      }
    }
  };
  emit.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return emit;
}

/** Combine several reporters into one. */
export function teeReporters(...reporters) {
  return (type, payload) => {
    for (const r of reporters) r(type, payload);
  };
}
