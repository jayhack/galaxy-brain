import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withWorkflow } from "workflow/next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appDir,
  },
};

export default withWorkflow(nextConfig);
