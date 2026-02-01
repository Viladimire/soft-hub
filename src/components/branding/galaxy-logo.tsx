"use client";

import { cn } from "@/lib/utils/cn";

type GalaxyLogoProps = {
  className?: string;
  size?: number;
};

const OrbitMark = ({ size }: { size: number }) => {
  const padding = Math.max(8, Math.round(size * 0.18));
  const view = 100;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${view} ${view}`}
      role="img"
      aria-label="SOFT-HUB"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="sh-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="0.55" stopColor="#6366f1" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="sh-orbit" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="0.18" stopColor="#22d3ee" stopOpacity="0.85" />
          <stop offset="0.52" stopColor="#6366f1" stopOpacity="0.9" />
          <stop offset="0.82" stopColor="#ec4899" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ec4899" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sh-glow" cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0b1220" floodOpacity="0.55" />
        </filter>
        <filter id="orbit-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#6366f1" floodOpacity="0.28" />
        </filter>
      </defs>

      <circle cx="50" cy="50" r="46" fill="url(#sh-glow)" />

      <g transform="rotate(-18 50 50)" filter="url(#orbit-glow)">
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="18"
          fill="none"
          stroke="url(#sh-orbit)"
          strokeWidth="2.1"
          opacity="0.95"
        />
        <circle cx="86" cy="50" r="2.6" fill="#ffffff" opacity="0.92" />
        <circle cx="86" cy="50" r="5.4" fill="#22d3ee" opacity="0.12" />
      </g>

      <g filter="url(#soft-shadow)">
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontSize="44"
          fontWeight="800"
          letterSpacing="-2"
          fill="url(#sh-mark)"
          fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI"
        >
          SH
        </text>
      </g>

      <rect x={padding} y={padding} width={view - padding * 2} height={view - padding * 2} rx="22" ry="22" fill="none" />
    </svg>
  );
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
        <div className={cn("h-[calc(100%-10px)] w-[calc(100%-10px)]")}> 
          <OrbitMark size={size - 10} />
        </div>
      </div>
    </div>
  );
};
