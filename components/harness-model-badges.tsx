import { Badge } from "@/components/ui/badge";
import { HarnessIcon } from "@/components/icons";
import { harnessLogoKind } from "@/lib/globules";
import type { Solution } from "@/lib/content";

export function HarnessModelBadges({ sol }: { sol: Solution }) {
  const short = sol.harnessShort || sol.harness.split("-")[0];
  const hasIcon = harnessLogoKind(sol.harness) != null;
  return (
    <>
      <Badge variant="outline" mono className="lowercase">
        {hasIcon ? <HarnessIcon harness={sol.harness} /> : null}
        {short}
      </Badge>
      <Badge variant="outline" mono>
        {sol.model}
      </Badge>
    </>
  );
}
