"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import type { Software } from "@/lib/types/software";
import { cn } from "@/lib/utils/cn";

export const SoftwareGallery = ({ software }: { software: Software }) => {
  const images = useMemo(() => {
    const hero = software.media.heroImage ? [software.media.heroImage] : [];
    const rest = software.media.gallery ?? [];
    return [...hero, ...rest].filter(Boolean);
  }, [software.media.gallery, software.media.heroImage]);

  const [active, setActive] = useState(0);
  const activeSrc = images[active] ?? null;

  return (
    <div className="space-y-4">
      <div className="relative h-52 sm:h-64 lg:h-72 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        {activeSrc ? (
          <Image src={activeSrc} alt={software.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 66vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">No preview available</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 via-neutral-950/15 to-transparent" />
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.slice(0, 8).map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-2xl border transition",
                index === active ? "border-primary-300/70" : "border-white/10 hover:border-white/25",
              )}
              aria-label={`Preview ${index + 1}`}
            >
              <Image src={src} alt={`${software.name} preview ${index + 1}`} fill className="object-cover" sizes="200px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
