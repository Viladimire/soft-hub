"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils/cn";

type InsightsHeroVisualProps = {
  className?: string;
};

export const InsightsHeroVisual = ({ className }: InsightsHeroVisualProps) => {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/50 p-6", className)}>
      <div className="pointer-events-none absolute -inset-1 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.30),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.22),transparent_55%)] blur-xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Live preview</p>
          <h3 className="text-xl font-semibold text-white">Engagement pulse</h3>
          <p className="text-sm text-neutral-300">Animated mock charts for downloads, searches, and retention.</p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Downloads", value: "+38%" },
              { label: "Search", value: "+21%" },
              { label: "Retention", value: "+12%" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/60 p-5"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.20),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.18),transparent_55%)]" />

            <svg viewBox="0 0 520 260" className="relative z-10 h-[240px] w-full" role="img" aria-label="Analytics preview">
              <defs>
                <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="rgba(34,211,238,0.9)" />
                  <stop offset="0.55" stopColor="rgba(99,102,241,0.95)" />
                  <stop offset="1" stopColor="rgba(236,72,153,0.92)" />
                </linearGradient>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="rgba(99,102,241,0.30)" />
                  <stop offset="1" stopColor="rgba(99,102,241,0)" />
                </linearGradient>
              </defs>

              <g opacity="0.35" stroke="rgba(255,255,255,0.18)">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <line key={idx} x1="0" x2="520" y1={40 + idx * 40} y2={40 + idx * 40} />
                ))}
              </g>

              <motion.path
                d="M 0 200 C 60 160 90 165 140 140 C 200 110 220 130 275 95 C 330 60 360 70 420 55 C 470 44 500 54 520 40"
                fill="none"
                stroke="url(#line)"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />

              <motion.path
                d="M 0 200 C 60 160 90 165 140 140 C 200 110 220 130 275 95 C 330 60 360 70 420 55 C 470 44 500 54 520 40 L 520 260 L 0 260 Z"
                fill="url(#area)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              />

              {[50, 160, 260, 360, 460].map((x, i) => (
                <motion.circle
                  key={x}
                  cx={x}
                  cy={170 - i * 22}
                  r="6"
                  fill="rgba(255,255,255,0.9)"
                  stroke="rgba(99,102,241,0.85)"
                  strokeWidth="3"
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.22 }}
                />
              ))}
            </svg>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs">
              <p className="text-white/60">Updated every ~10s (mock)</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
          </motion.div>

          <div className="pointer-events-none absolute -bottom-10 -right-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.25),transparent_60%)] blur-2xl" />
        </div>
      </div>
    </div>
  );
};
