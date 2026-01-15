import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "solid" | "soft" | "outline" | "accent";
};

const variantMap: Record<NonNullable<BadgeProps["variant"]>, string> = {
  solid: "bg-primary-500/90 text-white",
  soft: "bg-primary-500/10 text-primary-50 border border-primary-400/30",
  outline: "border border-neutral-700/60 text-neutral-100",
  accent: "bg-gradient-to-r from-primary-500 via-accent-500 to-cyan-400 text-white",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "soft", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
        "backdrop-blur border border-white/10",
        variantMap[variant],
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";
