// Assembles the committed, self-contained index.html:
//   src/template.html + three.min.js (r147, fetched once into vendor/) + src/game.js
// Usage: node build.mjs
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js";
const vendorPath = path.join(here, "vendor", "three.min.js");

async function threeSource() {
  try {
    await access(vendorPath);
  } catch {
    console.log("Fetching " + THREE_URL);
    const res = await fetch(THREE_URL);
    if (!res.ok) throw new Error("Failed to fetch three.js: " + res.status);
    await mkdir(path.dirname(vendorPath), { recursive: true });
    await writeFile(vendorPath, await res.text());
  }
  return readFile(vendorPath, "utf8");
}

const [template, three, game] = await Promise.all([
  readFile(path.join(here, "src", "template.html"), "utf8"),
  threeSource(),
  readFile(path.join(here, "src", "game.js"), "utf8"),
]);

// split/join instead of String.replace to avoid $-pattern surprises
const html = template
  .split("%%THREE_JS%%").join(three)
  .split("%%GAME_JS%%").join(game);

const out = path.join(here, "index.html");
await writeFile(out, html);
console.log("Wrote " + out + " (" + (html.length / 1024).toFixed(0) + " KB)");
