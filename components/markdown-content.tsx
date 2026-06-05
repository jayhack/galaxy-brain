import { cn } from "@/lib/utils";

/** Renders pre-sanitized, build-time markdown HTML in the globule prose style. */
export function MarkdownContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn("markdown-target", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
