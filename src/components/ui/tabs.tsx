"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils/cn";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-white/10",
      "bg-neutral-900/50 p-1 text-neutral-300 backdrop-blur",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
};

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, startIcon, endIcon, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "group inline-flex min-w-[120px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
      "text-neutral-400 transition duration-200",
      "data-[state=active]:bg-neutral-900 data-[state=active]:text-neutral-50",
      "data-[state=active]:shadow-soft",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
      className,
    )}
    {...props}
  >
    {startIcon ? <span className="text-inherit">{startIcon}</span> : null}
    <span>{children}</span>
    {endIcon ? <span className="text-inherit">{endIcon}</span> : null}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 rounded-xl border border-white/5 bg-neutral-950/60 p-6 text-neutral-100",
      "data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0",
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
