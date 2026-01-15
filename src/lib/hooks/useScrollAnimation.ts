"use client";

import { useInView } from "framer-motion";
import { useRef } from "react";

export const useScrollAnimation = (options?: Omit<Parameters<typeof useInView>[1], "amount"> & { amount?: number }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.1, once: true, ...options });

  return { ref, inView };
};
