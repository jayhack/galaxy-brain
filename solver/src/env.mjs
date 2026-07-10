import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repo root is two levels up from solver/src. */
export const repoRoot = path.resolve(here, "..", "..");
export const solverRoot = path.resolve(here, "..");

/**
 * Load environment variables from `.env` files using Node's built-in
 * `process.loadEnvFile` (Node >= 20.12 / stable in 22). We load, in order:
 *   1. <repoRoot>/.env        (where the user is told to put Daytona + agent keys)
 *   2. <solverRoot>/.env      (optional override local to the tool)
 * Existing process.env values always win, and later files only fill gaps.
 */
export function loadEnv() {
  const candidates = [
    path.join(repoRoot, ".env"),
    path.join(solverRoot, ".env"),
  ];

  for (const file of candidates) {
    try {
      const before = { ...process.env };
      process.loadEnvFile(file);
      // Restore any keys that were already set in the real environment so
      // an explicit shell export always beats a value from a .env file.
      for (const [key, value] of Object.entries(before)) {
        if (value !== undefined) process.env[key] = value;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.warn(`Warning: could not read ${file}: ${error.message}`);
      }
    }
  }
}

/** Read the first env var that is set among the given names. */
export function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

/** Throw a friendly error if a required env var is missing. */
export function requireEnv(names, purpose) {
  const value = firstEnv(...names);
  if (!value) {
    const list = names.join(" or ");
    throw new Error(
      `Missing required environment variable ${list}${
        purpose ? ` (${purpose})` : ""
      }. Add it to ${path.join(repoRoot, ".env")}.`
    );
  }
  return value;
}
