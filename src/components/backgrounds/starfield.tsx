'use client';

import { cn } from "@/lib/utils/cn";

type StarfieldProps = {
  className?: string;
  intensity?: "soft" | "medium";
};

export const Starfield = ({ className, intensity = "soft" }: StarfieldProps) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        intensity === "medium" ? "opacity-80" : "opacity-55",
        className,
      )}
    >
      <div className="absolute inset-0 starfield-layer starfield-layer--near" />
      <div className="absolute inset-0 starfield-layer starfield-layer--mid" />
      <div className="absolute inset-0 starfield-layer starfield-layer--far" />
      <div className="absolute -inset-16 starfield-glow" />
    </div>
  );
};
