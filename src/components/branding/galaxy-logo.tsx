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
      <div className="absolute inset-0 rounded-3xl bg-[conic-gradient(from_180deg,rgba(34,211,238,0.45),rgba(99,102,241,0.55),rgba(236,72,153,0.55),rgba(34,211,238,0.45))] opacity-80 blur-[10px]" />
      <div className="absolute inset-0 rounded-3xl bg-black/15 dark:bg-white/5" />

      <div className="absolute inset-0 rounded-3xl galaxy-orbit" aria-hidden="true" />
      <div className="absolute inset-0 rounded-3xl galaxy-stars" aria-hidden="true" />

      <div className="relative z-10 flex h-full w-full items-center justify-center rounded-3xl border border-white/15 bg-white/5 shadow-[0_18px_48px_rgba(79,70,229,0.35)]">
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
