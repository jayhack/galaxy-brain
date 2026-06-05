import { readFile } from "node:fs/promises";
import path from "node:path";

const dataPath = path.join(process.cwd(), "docs", "data.json");

export async function GET() {
  const data = await readFile(dataPath, "utf8");

  return new Response(data, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}
