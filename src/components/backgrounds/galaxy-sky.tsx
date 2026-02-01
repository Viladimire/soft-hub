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
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("soft-hub.skyMode");
  }, []);

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        // z-0 ensures it stays above the body background on all browsers,
        // while still behind app content (which uses higher z-index).
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      <Starfield className="opacity-30" intensity={intensity === "medium" ? "soft" : intensity} />
      <div className="absolute inset-0 galaxy-nebula galaxy-nebula--subtle" />
      <div className="absolute inset-0 galaxy-dim" />
      <div className="absolute inset-0 galaxy-vignette" />
    </div>
  );
};
