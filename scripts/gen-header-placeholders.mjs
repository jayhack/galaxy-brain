#!/usr/bin/env node
// Generates blurred SVG placeholders that approximate each eval header photo.
//
// For every image in `public/headers/<slug>.jpg` we downscale to a tiny raster,
// embed it inside an SVG that applies a Gaussian blur, and base64-encode the
// whole SVG into a data URI. The map is written to
// `lib/header-placeholders.json` and consumed at build time, so the deployed
// site never needs `sharp` — only this generator does.
//
// Re-run after adding or changing a header image:
//   node scripts/gen-header-placeholders.mjs

import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const headersDir = path.join(repoRoot, "public", "headers");
const outFile = path.join(repoRoot, "lib", "header-placeholders.json");

// Tiny raster the SVG blur is built from. Small enough to keep the data URI
// light, large enough that the blurred result still reads as the photo.
const RASTER_WIDTH = 32;

function buildSvg(base64Jpeg, width, height) {
  // Bleed the image a little past the viewBox so the Gaussian blur does not
  // leave a transparent halo at the edges, then blur in user (viewBox) units.
  const bleed = Math.max(2, Math.round(width * 0.06));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">`,
    `<filter id="b" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${(width * 0.06).toFixed(2)}"/></filter>`,
    `<image filter="url(#b)" x="${-bleed}" y="${-bleed}" width="${width + bleed * 2}" height="${height + bleed * 2}" preserveAspectRatio="none" xlink:href="data:image/jpeg;base64,${base64Jpeg}"/>`,
    `</svg>`,
  ].join("");
}

async function main() {
  let files;
  try {
    files = await readdir(headersDir);
  } catch {
    console.error(`No headers directory at ${headersDir}; nothing to do.`);
    return;
  }

  const jpgs = files.filter((f) => /\.jpe?g$/i.test(f)).sort();
  const out = {};

  for (const file of jpgs) {
    const slug = file.replace(/\.jpe?g$/i, "");
    const input = path.join(headersDir, file);

    const small = sharp(input).resize({
      width: RASTER_WIDTH,
      withoutEnlargement: true,
    });
    const { data, info } = await small
      .jpeg({ quality: 55, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    const svg = buildSvg(data.toString("base64"), info.width, info.height);
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    out[slug] = uri;
    console.log(`  ${slug}: ${info.width}x${info.height}, ${uri.length} bytes`);
  }

  const sorted = Object.fromEntries(
    Object.keys(out)
      .sort()
      .map((k) => [k, out[k]])
  );
  await writeFile(outFile, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Wrote ${Object.keys(sorted).length} placeholders to ${path.relative(repoRoot, outFile)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
