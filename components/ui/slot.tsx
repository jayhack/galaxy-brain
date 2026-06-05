import * as React from "react";

import { cn } from "@/lib/utils";

type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

function Slot({ children, className, ...props }: SlotProps) {
  if (!React.isValidElement(children)) {
    return null;
  }

  const child = children as React.ReactElement<{
    className?: string;
  }>;

  return React.cloneElement(child, {
    ...props,
    className: cn(child.props.className, className),
  });
}

export { Slot };
