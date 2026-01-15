"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleCheck, CircleX, Info, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-3",
      "sm:right-8",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  cn(
    "group relative pointer-events-auto flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4",
    "bg-neutral-950/80 text-neutral-100 shadow-soft backdrop-blur-xl",
    "transition-all duration-300",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=open]:slide-in-from-bottom-full",
    "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:duration-200",
    "data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full",
  ),
  {
    variants: {
      variant: {
        default: "border-white/10",
        success: "border-success-500/60 bg-success-500/10 text-success-200",
        danger: "border-danger-500/60 bg-danger-500/10 text-danger-200",
        info: "border-primary-400/50 bg-primary-500/10 text-primary-100",
        loading: "border-neutral-700/50 bg-neutral-900/80 text-neutral-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconMap: Record<NonNullable<VariantProps<typeof toastVariants>["variant"]>, React.ReactNode> = {
  default: <Info className="h-4 w-4" />,
  success: <CircleCheck className="h-4 w-4" />,
  danger: <CircleX className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  loading: <Loader2 className="h-4 w-4 animate-spin" />,
};

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(toastVariants({ variant }), className)}
    {...props}
  >
    <span className="mt-1 text-primary-100/90">{iconMap[variant ?? "default"]}</span>
    <div className="space-y-1 text-sm leading-5">
      {children}
    </div>
  </ToastPrimitives.Root>
));
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "ml-auto inline-flex items-center rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-neutral-100",
      "transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full border border-white/10 bg-white/5 p-1 text-neutral-400",
      "transition hover:bg-white/10 hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
      className,
    )}
    {...props}
  >
    <span className="sr-only">إغلاق</span>
    ×
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold text-inherit", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs text-inherit/80", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
};
