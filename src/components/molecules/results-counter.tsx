'use client';

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

export type ResultsCounterProps = {
  total: number;
  isInitialLoading?: boolean;
  isUpdating?: boolean;
  usedFallback?: boolean;
};

const headingVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
} as const;

export const ResultsCounter = ({ total, isInitialLoading = false, isUpdating = false, usedFallback = false }: ResultsCounterProps) => {
  const t = useTranslations("softwareGrid");

  const headingText = useMemo(() => {
    if (total > 0) {
      return t("heading.count", { count: total });
    }

    return t("heading.default");
  }, [t, total]);

  const formattedStatuses = useMemo(() => {
    const statuses: string[] = [];

    if (isInitialLoading) {
      statuses.push(t("status.loading"));
    }

    if (!isInitialLoading && isUpdating && total > 0) {
      statuses.push(t("status.updating"));
    }

    return statuses;
  }, [isInitialLoading, isUpdating, t, total]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <AnimatePresence mode="wait">
        <motion.span
          key={headingText}
          variants={headingVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="text-sm font-medium text-white"
        >
          {headingText}
        </motion.span>
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <AnimatePresence>
          {formattedStatuses.map((status) => (
            <motion.span
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-neutral-300"
            >
              {status}
            </motion.span>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {usedFallback ? (
            <motion.span
              key="fallback"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200"
            >
              {t("fallbackBadge")}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};
