"use client";

import { useScroll, useTransform } from "framer-motion";
import { useMemo } from "react";

export const useParallax = (distance = 120) => {
  const { scrollYProgress } = useScroll();

  const y = useTransform(scrollYProgress, [0, 1], [0, distance]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.85]);

  return useMemo(() => ({ y, opacity }), [opacity, y]);
};
