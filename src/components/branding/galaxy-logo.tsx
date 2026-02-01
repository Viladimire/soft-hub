"use client";

import Image from "next/image";

import { cn } from "@/lib/utils/cn";

import brandMark from "../../../Logo/logo.png";

type GalaxyLogoProps = {
  className?: string;
  size?: number;
};

export const GalaxyLogo = ({ className, size = 48 }: GalaxyLogoProps) => {
  return (
    <div
      className={cn(
        "relative grid place-items-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_55%)] opacity-80 blur-[10px]" />
      <div className="absolute inset-0 rounded-3xl bg-black/10 dark:bg-white/5" />

      <div className="absolute inset-0 rounded-3xl orbit-ring" aria-hidden="true" />

      <div className="relative z-10 flex h-full w-full items-center justify-center rounded-3xl border border-black/10 bg-black/5 shadow-[0_18px_48px_rgba(15,23,42,0.35)] dark:border-white/15 dark:bg-white/5 dark:shadow-[0_18px_48px_rgba(79,70,229,0.35)]">
        <Image
          src={brandMark}
          alt="SOFT-HUB logo"
          width={size}
          height={size}
          className={cn("h-[calc(100%-10px)] w-[calc(100%-10px)] object-contain")}
          priority
        />
      </div>
    </div>
  );
};
