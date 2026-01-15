"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, rows = 4, ...props }, ref) => (
    <div className={cn("space-y-1.5", className)}>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full rounded-lg border border-white/10 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-100",
          "placeholder:text-neutral-400 shadow-sm transition duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:border-primary-300",
          error ? "border-danger-500/70" : "",
          props.disabled ? "opacity-60" : "",
        )}
        {...props}
      />
      {error ? <p className="text-xs text-danger-400">{error}</p> : null}
    </div>
  ),
);
Textarea.displayName = "Textarea";
