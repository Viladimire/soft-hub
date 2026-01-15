'use client';

import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { useSoftwareFiltered } from "@/lib/hooks/useSoftwareFiltered";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SoftwareCard } from "@/components/molecules/software-card";
import { SortDropdown } from "@/components/molecules/sort-dropdown";
import { ResultsCounter } from "@/components/molecules/results-counter";
import { EmptyState, type EmptyStateVariant } from "@/components/layouts/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const GRID_CLASSES = "grid gap-6 md:grid-cols-2 xl:grid-cols-3";

const SoftwareCardSkeleton = ({ index }: { index: number }) => (
  <motion.div
    className="rounded-3xl border border-white/10 bg-white/5 p-5"
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
  >
    <Skeleton className="mb-4 h-40 w-full overflow-hidden rounded-2xl" />
    <div className="space-y-3">
      <Skeleton variant="text" className="w-2/3" />
      <Skeleton variant="text" className="w-5/6" />
      <Skeleton variant="text" className="w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-full" />
    </div>
  </motion.div>
);

const LoadingState = () => (
  <div className={GRID_CLASSES}>
    {Array.from({ length: 6 }).map((_, index) => (
      <SoftwareCardSkeleton key={index} index={index} />
    ))}
  </div>
);

export const SoftwareGrid = () => {
  const {
    items,
    total,
    usedFallback,
    filtersState,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useSoftwareFiltered();

  const t = useTranslations("softwareGrid");
  const emptyT = useTranslations("emptyState");

  const isInitialLoading = isLoading && items.length === 0;
  const isUpdating = !isInitialLoading && (isFetching || isFetchingNextPage);

  const shouldShowEmpty = !isInitialLoading && !isError && items.length === 0;

  const gridItems = useMemo(
    () =>
      items.map((software, index) => (
        <motion.div
          key={software.id}
          layout
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.4, ease: "easeOut" }}
        >
          <SoftwareCard software={software} />
        </motion.div>
      )),
    [items],
  );

  const emptyVariant: EmptyStateVariant = filtersState.hasActiveFilters ? "noResults" : "noSoftware";

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const shouldShowLoadMore = hasNextPage && !isError && items.length > 0;

  const loadMoreLabel = isFetchingNextPage ? t("actions.loadingMore") : t("actions.loadMore");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
        <ResultsCounter
          total={total}
          isInitialLoading={isInitialLoading}
          isUpdating={isUpdating && !isFetchingNextPage}
          usedFallback={usedFallback}
        />
        <SortDropdown />
      </div>

      <AnimatePresence mode="wait">
        {isInitialLoading ? (
          <motion.div key="loading" exit={{ opacity: 0 }}>
            <LoadingState />
          </motion.div>
        ) : null}

        {isError ? (
          <motion.div key="error" exit={{ opacity: 0 }}>
            <EmptyState variant="error" onAction={() => refetch()} />
          </motion.div>
        ) : null}

        {shouldShowEmpty ? (
          <motion.div key="empty" exit={{ opacity: 0 }}>
            <EmptyState
              variant={emptyVariant}
              onAction={emptyVariant === "noResults" ? filtersState.resetFilters : undefined}
              actionLabel={
                emptyVariant === "noResults" ? emptyT("noResults.action") : undefined
              }
            />
          </motion.div>
        ) : null}

        {!isInitialLoading && !isError && !shouldShowEmpty ? (
          <motion.div key="grid" exit={{ opacity: 0 }} className={GRID_CLASSES}>
            {gridItems}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {shouldShowLoadMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-2 text-sm text-neutral-100 backdrop-blur-xl transition hover:bg-white/20"
            onClick={handleLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <LoadingSpinner size="sm" className="shrink-0" label={loadMoreLabel} />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>{loadMoreLabel}</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
};
