export const animations = {
  durations: {
    instant: 120,
    fast: 200,
    base: 320,
    slow: 480,
    deliberate: 640,
  },
  easings: {
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    in: "cubic-bezier(0.64, 0, 0.78, 0)",
    inOut: "cubic-bezier(0.87, 0, 0.13, 1)",
    bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    spring: "cubic-bezier(0.16, 1, 0.3, 1.4)",
  },
  keyframes: {
    fadeIn: "fade-in 320ms var(--ease-out)",
    rise: "rise 400ms var(--ease-out)",
    shimmer: "shimmer 2000ms linear infinite",
  },
} as const;

export type AnimationTokens = typeof animations;
