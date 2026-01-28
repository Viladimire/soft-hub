import { cn } from "@/lib/utils/cn";

type SkeletonVariant = "default" | "card" | "text" | "circle";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  shimmer?: boolean;
  variant?: SkeletonVariant;
};

const variantClasses: Record<SkeletonVariant, string> = {
  default: "rounded-xl",
  card: "rounded-3xl p-6",
  text: "h-3 rounded-full",
  circle: "aspect-square rounded-full",
};

export const Skeleton = ({ className, shimmer = true, variant = "default", ...props }: SkeletonProps) => (
  <div
    className={cn(
      "relative overflow-hidden bg-gradient-to-br from-white/14 via-white/6 to-white/14",
      "shadow-[0_0_22px_rgba(12,20,40,0.28)] backdrop-blur-xl",
      "before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.45),transparent)]",
      shimmer && "before:animate-[shimmer_1.6s_infinite] before:translate-x-[-100%]",
      !shimmer && "before:hidden",
      "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-white/8",
      variantClasses[variant],
      className,
    )}
    {...props}
  />
);
