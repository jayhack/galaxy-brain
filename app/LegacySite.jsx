"use client";

import { useEffect, useState } from "react";

const externalScripts = [
  "https://cdn.jsdelivr.net/npm/marked@14.1.3/marked.min.js",
  "https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js",
];

function loadScript(src) {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    if (existing.dataset.loaded === "true") return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function LegacySite() {
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        for (const src of externalScripts) {
          await loadScript(src);
        }
        if (!cancelled) await import("../docs/app.js");
      } catch (error) {
        if (!cancelled) setLoadError(error);
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  return loadError ? (
    <div className="alert alert-error m-4" role="alert">
      <span>Failed to load the galaxy-brain app: {loadError.message}</span>
    </div>
  ) : null;
}
