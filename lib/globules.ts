export type Globule = { color: string; shade: string };

/** The six globule colours, cycled to give each item its own sphere. */
export const globulePalette: Globule[] = [
  { color: "var(--cyan)", shade: "var(--cyan-d)" },
  { color: "var(--magenta)", shade: "var(--magenta-d)" },
  { color: "var(--lime)", shade: "var(--lime-d)" },
  { color: "var(--cobalt)", shade: "var(--cobalt-d)" },
  { color: "var(--sun)", shade: "var(--sun-d)" },
  { color: "var(--indigo)", shade: "var(--indigo-d)" },
];

export function globuleForIndex(i: number): Globule {
  const n = globulePalette.length;
  return globulePalette[((i % n) + n) % n];
}

/** status -> globule colour for the status pill's dot. */
export const statusGlobule: Record<string, Globule> = {
  submitted: { color: "var(--cobalt)", shade: "var(--cobalt-d)" },
  passed: { color: "var(--lime)", shade: "var(--lime-d)" },
  failed: { color: "var(--magenta)", shade: "var(--magenta-d)" },
  in_progress: { color: "var(--sun)", shade: "var(--sun-d)" },
  skipped: { color: "var(--paper-3)", shade: "#9a8b5e" },
};

export function harnessLogoKind(
  harness: string | undefined | null
): "cursor" | "codex" | "claude" | null {
  const h = String(harness ?? "").trim().toLowerCase();
  if (!h) return null;
  if (h === "cursor" || h.startsWith("cursor-")) return "cursor";
  if (h === "codex" || h.startsWith("codex-")) return "codex";
  if (h === "claude" || h.startsWith("claude-")) return "claude";
  return null;
}
