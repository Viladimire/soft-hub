"use client";

import { useEffect, useState } from "react";

import { Starfield } from "@/components/backgrounds/starfield";
import { cn } from "@/lib/utils/cn";

type GalaxySkyProps = {
  className?: string;
  intensity?: "soft" | "medium";
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(Boolean(media.matches));

    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return reduced;
};

export const GalaxySky = ({ className, intensity = "medium" }: GalaxySkyProps) => {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-20 overflow-hidden",
        className,
      )}
    >
      <Starfield className="opacity-70 animate-starfield-parallax" intensity={intensity} />

      <div className="absolute inset-0 galaxy-nebula" />

      <div className="absolute inset-0 meteor-layer">
        <span className="meteor meteor-1" />
        <span className="meteor meteor-2" />
        <span className="meteor meteor-3" />
        <span className="meteor meteor-4" />
        <span className="meteor meteor-5" />
      </div>

      <div className="absolute inset-0 galaxy-vignette" />
    </div>
  );
};
