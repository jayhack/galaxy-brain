import { Badge } from "@/components/ui/badge";
import { GlobuleDot } from "@/components/globule";
import { statusGlobule } from "@/lib/globules";

export function StatusBadge({ status }: { status?: string | null }) {
  const label = status || "unknown";
  const g = statusGlobule[status ?? ""] ?? {
    color: "var(--paper-3)",
    shade: "#9a8b5e",
  };
  return (
    <Badge variant="outline" className="gap-1.5 pl-2.5">
      <GlobuleDot globule={g} />
      {label}
    </Badge>
  );
}
