"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-500 text-white shadow-soft hover:bg-primary-400 focus-visible:ring-primary-300",
        secondary:
          "bg-neutral-900/60 text-neutral-50 shadow-soft hover:bg-neutral-900 focus-visible:ring-neutral-700",
        ghost:
          "bg-transparent text-primary-200 hover:text-primary-100 hover:bg-primary-500/10 focus-visible:ring-primary-300",
        outline:
          "border border-primary-400/50 text-primary-100 hover:bg-primary-500/10 focus-visible:ring-primary-300",
        subtle:
          "bg-neutral-900/40 text-neutral-100 hover:bg-neutral-900/55 focus-visible:ring-neutral-700",
        accent:
          "bg-gradient-to-r from-primary-500 via-accent-500 to-cyan-400 text-white shadow-glow hover:opacity-95",
        danger:
          "bg-danger-500 text-white hover:bg-danger-400 focus-visible:ring-danger-300",
      },
      size: {
        sm: "h-9 px-3 py-2 text-xs",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-5 text-base",
        xl: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
      glow: {
        true: "after:absolute after:inset-0 after:-z-10 after:rounded-lg after:bg-gradient-to-r after:from-primary-500/40 after:via-accent-500/20 after:to-cyan-400/30 after:blur-2xl after:opacity-0 hover:after:opacity-100 transition-all",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export type ButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariants & {
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, glow, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, glow }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
