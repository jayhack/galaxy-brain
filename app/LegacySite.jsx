"use client";

import { useEffect, useState } from "react";

export default function LegacySite() {
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const [{ marked }, DOMPurify] = await Promise.all([
          import("marked"),
          import("dompurify"),
        ]);
        window.marked = marked;
        window.DOMPurify = DOMPurify.default || DOMPurify;
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
