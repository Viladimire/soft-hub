"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  error?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", leadingIcon, trailingIcon, error, ...props }, ref) => {
    const hasAdornment = leadingIcon || trailingIcon;

    return (
      <div className={cn("space-y-1.5", className)}>
        <div
          className={cn(
            "group flex h-11 w-full items-center gap-3 rounded-lg border border-white/10",
            "bg-neutral-900/50 px-4 text-sm text-neutral-50 transition duration-fast",
            "focus-within:border-blue-500/50 focus-within:bg-neutral-900/70 focus-within:shadow-soft",
            error ? "border-danger-500/70" : "",
            props.disabled ? "opacity-60" : "",
          )}
        >
          {leadingIcon ? (
            <span className="text-neutral-400 transition-colors duration-200 group-focus-within:text-primary-200">
              {leadingIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            type={type}
            className={cn(
              "flex-1 bg-transparent text-sm text-inherit placeholder:text-neutral-400",
              "focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed",
              hasAdornment ? "py-2" : "h-full",
            )}
            {...props}
          />
          {trailingIcon ? (
            <span className="text-neutral-400 transition-colors duration-200 group-focus-within:text-primary-200">
              {trailingIcon}
            </span>
          ) : null}
        </div>
        {error ? <p className="text-xs text-danger-400">{error}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";
