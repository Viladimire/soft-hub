'use client';

import { useEffect, useRef, useState } from "react";

export type UseCountUpOptions = {
  start?: number;
  duration?: number;
  easing?: (progress: number) => number;
  active?: boolean;
};

const defaultEasing = (progress: number) => 1 - Math.pow(1 - progress, 3);

export const useCountUp = (target: number, options: UseCountUpOptions = {}) => {
  const { start = 0, duration = 1200, easing = defaultEasing, active = true } = options;

  const [value, setValue] = useState(start);

  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const previousTargetRef = useRef<number>(target);

  useEffect(() => {
    previousTargetRef.current = target;
  }, [target]);

  useEffect(() => {
    const cancel = () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const runAnimation = () => {
      startTimeRef.current = null;

      const tick = (timestamp: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easing(progress);
        const nextValue = start + (previousTargetRef.current - start) * eased;

        setValue(progress >= 1 ? previousTargetRef.current : nextValue);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    cancel();

    frameRef.current = requestAnimationFrame(() => {
      setValue(start);

      if (active) {
        runAnimation();
      }
    });

    if (!active) {
      return cancel;
    }

    return cancel;
  }, [active, duration, easing, start, target]);

  return value;
};
