import { readFile } from "node:fs/promises";
import path from "node:path";

const artifactsRoot = path.join(process.cwd(), "docs", "artifacts");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function safeArtifactPath(parts) {
  const filePath = path.resolve(artifactsRoot, ...parts);
  const relativePath = path.relative(artifactsRoot, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return null;
  return filePath;
}

export async function GET(_request, context) {
  const params = await context.params;
  const filePath = safeArtifactPath(params.path || []);
  if (!filePath) return new Response("Not found", { status: 404 });

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    return new Response(file, {
      headers: {
        "content-type": contentTypes[ext] || "application/octet-stream",
        "cache-control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    if (error?.code === "ENOENT") return new Response("Not found", { status: 404 });
    throw error;
  }
}
