import { withWorkflow } from "workflow/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Persist the Turbopack compile cache to .next/cache so Vercel's build
    // cache restores it between deploys (experimental for `next build`;
    // delete .next/cache if a build ever fails with a corrupted-cache error).
    turbopackFileSystemCacheForBuild: true,
  },
};

export default withWorkflow(nextConfig, {
  workflows: {
    // Skip the eager full-repo directive scan at build startup; eval solution
    // folders make the tree large and workflows only live in workflows/.
    lazyDiscovery: true,
  },
});
