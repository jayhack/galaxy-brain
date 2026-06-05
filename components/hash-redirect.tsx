"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Back-compat for the old hash-routed SPA: maps legacy `#/...` URLs onto the
 * new real paths (and `private-memory` -> `web-short-story`). Runs only when a
 * legacy hash is present, so normal navigation is untouched.
 */
function targetForHash(hash: string): string | null {
  if (!hash || !hash.startsWith("#/")) return null;
  const parts = hash.slice(1).split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  if (parts[0] === "about") return "/about";
  if (parts[0] === "tag" && parts[1]) {
    const tags = parts[1].split("+").map(decode).filter(Boolean);
    return tags.length ? `/?tags=${tags.map(encodeURIComponent).join(",")}` : "/";
  }
  if (parts[0] === "eval" && parts.length >= 2) {
    const evalSlug = parts[1] === "private-memory" ? "web-short-story" : parts[1];
    return parts.length >= 3
      ? `/eval/${evalSlug}/${parts[2]}`
      : `/eval/${evalSlug}`;
  }
  return null;
}

export function HashRedirect() {
  const router = useRouter();

  React.useEffect(() => {
    function handle() {
      const target = targetForHash(window.location.hash);
      if (!target) return;
      // Drop the hash so this does not re-fire, then route.
      history.replaceState(null, "", window.location.pathname);
      router.replace(target);
    }
    handle();
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, [router]);

  return null;
}
