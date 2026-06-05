"use client";

import * as React from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  text,
  label = "copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = React.useState<"idle" | "ok" | "err">("idle");

  async function onClick() {
    const ok = await copyText(text);
    setState(ok ? "ok" : "err");
    window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={onClick}
      aria-label="Copy markdown to clipboard"
      className={cn(
        state === "ok" && "text-[var(--lime-d)]",
        state === "err" && "text-[var(--magenta-d)]",
        className
      )}
    >
      <Copy className="size-3.5" />
      {state === "ok" ? "copied" : state === "err" ? "failed" : label}
    </Button>
  );
}
