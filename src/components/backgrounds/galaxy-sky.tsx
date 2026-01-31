"use client";

import { useEffect, useRef, useState } from "react";

import { Starfield } from "@/components/backgrounds/starfield";
import { cn } from "@/lib/utils/cn";

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

type GalaxySkyProps = {
  className?: string;
  intensity?: "soft" | "medium";
};

const useLowPowerMode = () => {
  const [lowPower] = useState(() => {
    if (typeof window === "undefined") return false;

    const nav = navigator as Navigator & {
      connection?: NetworkInformation;
      deviceMemory?: number;
    };

    const saveData = Boolean(nav.connection?.saveData);
    const effectiveType = String(nav.connection?.effectiveType ?? "");
    const slowNet = effectiveType.includes("2g") || effectiveType.includes("slow-2g");

    const deviceMemory = Number(nav.deviceMemory ?? 0);
    const cores = Number(navigator.hardwareConcurrency ?? 0);

    return saveData || slowNet || (deviceMemory > 0 && deviceMemory < 4) || (cores > 0 && cores < 4);
  });

  return lowPower;
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
  const lowPower = useLowPowerMode();

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    if (lowPower) return;
    if (!rootRef.current) return;
    if (typeof window === "undefined") return;

    let raf: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const apply = () => {
      raf = null;
      const el = rootRef.current;
      if (!el) return;

      // Gentle smoothing to avoid jank.
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      el.style.setProperty("--sky-x", `${currentX.toFixed(2)}px`);
      el.style.setProperty("--sky-y", `${currentY.toFixed(2)}px`);

      // Continue settling after mouse stops.
      if (Math.abs(targetX - currentX) > 0.15 || Math.abs(targetY - currentY) > 0.15) {
        raf = window.requestAnimationFrame(apply);
      }
    };

    const onMove = (event: MouseEvent) => {
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const nx = (event.clientX / vw - 0.5) * 2;
      const ny = (event.clientY / vh - 0.5) * 2;

      // Keep it subtle for performance & readability.
      targetX = nx * 10;
      targetY = ny * 8;

      if (raf == null) {
        raf = window.requestAnimationFrame(apply);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf != null) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [reducedMotion, lowPower]);

  if (reducedMotion) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        // z-0 ensures it stays above the body background on all browsers,
        // while still behind app content (which uses higher z-index).
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 galaxy-parallax">
        <Starfield
          className={cn(
            "opacity-70",
            lowPower ? null : "animate-starfield-parallax",
          )}
          intensity={intensity}
        />

        <div className="absolute inset-0 galaxy-nebula" />
        {lowPower ? null : <div className="absolute inset-0 galaxy-nebula galaxy-nebula--strong" />}
        <div className="absolute inset-0 galaxy-milkyway" />

        {lowPower ? null : (
          <div className="absolute inset-0 meteor-layer">
            <span className="meteor meteor-1" />
            <span className="meteor meteor-2" />
            <span className="meteor meteor-3" />
          </div>
        )}
      </div>

      <div className="absolute inset-0 galaxy-dim" />
      <div className="absolute inset-0 galaxy-vignette" />
    </div>
  );
};
