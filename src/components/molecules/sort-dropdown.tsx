'use client';

import { useMemo, type ReactNode } from 'react';
import { ArrowDownUp, ArrowUpAZ, Check, Clock3, Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { FilterSortOption } from '@/lib/hooks/useFilters';
import { useFilters } from '@/lib/hooks/useFilters';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const iconBySort: Record<FilterSortOption, ReactNode> = {
  latest: <Clock3 className="h-4 w-4" />,
  popular: <Flame className="h-4 w-4" />,
  name: <ArrowUpAZ className="h-4 w-4" />,
};

export const SortDropdown = () => {
  const { snapshot, setSortBy } = useFilters();
  const t = useTranslations('filters');

  const options = useMemo(() => t.raw('sortOptions') as Record<FilterSortOption, string>, [t]);

  const handleSelect = (value: FilterSortOption) => {
    if (snapshot.sortBy === value) return;
    setSortBy(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-medium text-neutral-100 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/15"
        >
          <ArrowDownUp className="h-4 w-4 text-primary-200" />
          <span>{t('sortLabel')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        className="min-w-[220px] rounded-2xl border border-white/10 bg-neutral-950/95 p-2 text-sm text-neutral-100 shadow-xl backdrop-blur-xl"
      >
        <DropdownMenuLabel className="flex flex-col gap-1 text-[13px] text-neutral-300">
          <span className="font-medium text-white">{t('sortLabel')}</span>
          <span className="text-[11px] text-neutral-400">{t('sortDescription')}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {Object.entries(options).map(([key, label]) => {
          const value = key as FilterSortOption;
          const isActive = snapshot.sortBy === value;

          return (
            <DropdownMenuItem
              key={value}
              onClick={() => handleSelect(value)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-neutral-200 transition hover:bg-white/10 focus:bg-white/10 data-[state=checked]:bg-primary-500/15"
              data-state={isActive ? 'checked' : 'unchecked'}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-primary-100">
                {iconBySort[value]}
              </span>
              <span className="flex-1 text-sm font-medium">{label}</span>
              {isActive ? <Check className="h-3 w-3 text-primary-200" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
