'use client';

import { forwardRef } from "react";

import { cn } from "@/lib/utils/cn";

const sizeClasses = {
  sm: {
    wrapper: "h-7 w-7",
    inset: "inset-[3px]",
  },
  md: {
    wrapper: "h-10 w-10",
    inset: "inset-[4px]",
  },
  lg: {
    wrapper: "h-14 w-14",
    inset: "inset-[6px]",
  },
} as const;

export type LoadingSpinnerSize = keyof typeof sizeClasses;

export type LoadingSpinnerProps = React.HTMLAttributes<HTMLSpanElement> & {
  size?: LoadingSpinnerSize;
  label?: string;
};

export const LoadingSpinner = forwardRef<HTMLSpanElement, LoadingSpinnerProps>(
  ({ size = "md", className, label, ...props }, ref) => {
    const classes = sizeClasses[size];

    return (
      <span
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label={label ?? "Loading"}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-full",
          classes.wrapper,
          className,
        )}
        {...props}
      >
        <span className="absolute inset-0 animate-[spin_1.1s_linear_infinite]">
          <span className="block h-full w-full rounded-full bg-[conic-gradient(from_0deg,rgba(0,102,255,0.9),rgba(124,58,237,0.85),rgba(16,185,129,0.8),rgba(0,102,255,0.9))]" />
        </span>
        <span
          className={cn(
            "absolute rounded-full bg-slate-950/80 backdrop-blur-md",
            classes.inset,
          )}
        />
        <span className="absolute inset-[2px] rounded-full border border-white/10" />
        <span className="sr-only">{label ?? "Loading"}</span>
      </span>
    );
  },
);

LoadingSpinner.displayName = "LoadingSpinner";
