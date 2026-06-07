import { cn } from "@/lib/utils";

type ContentContainerProps = {
  /**
   * Reading pages constrain to a comfortable text measure; the homepage opts
   * into a wider measure so the eval-card grid stays multi-column.
   */
  width?: "reading" | "wide";
  className?: string;
  children: React.ReactNode;
};

export function ContentContainer({
  width = "reading",
  className,
  children,
}: ContentContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        width === "wide" ? "max-w-5xl" : "max-w-3xl",
        className
      )}
    >
      {children}
    </div>
  );
}
