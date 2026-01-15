'use client';

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Package, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";

export type EmptyStateVariant = "noResults" | "noSoftware" | "error";

type EmptyStateConfig = {
  icon: LucideIcon;
  accent: string;
  background: string;
  action: "reset" | "browse" | "retry";
};

const variantMap: Record<EmptyStateVariant, EmptyStateConfig> = {
  noResults: {
    icon: Search,
    accent: "bg-[radial-gradient(circle_at_center,rgba(0,102,255,0.22),rgba(0,102,255,0))] text-primary-100",
    background: "border border-white/12 bg-white/6 text-neutral-100 backdrop-blur-2xl",
    action: "reset",
  },
  noSoftware: {
    icon: Package,
    accent: "bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.24),rgba(124,58,237,0))] text-accent-100",
    background: "border border-white/12 bg-white/7 text-neutral-100 backdrop-blur-2xl",
    action: "browse",
  },
  error: {
    icon: AlertCircle,
    accent: "bg-[radial-gradient(circle_at_center,rgba(248,113,113,0.26),rgba(248,113,113,0))] text-rose-100",
    background: "border border-rose-400/30 bg-rose-500/10 text-rose-50 backdrop-blur-2xl",
    action: "retry",
  },
};

export type EmptyStateProps = {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  className?: string;
};

export const EmptyState = ({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled,
  className,
}: EmptyStateProps) => {
  const t = useTranslations("emptyState");
  const config = variantMap[variant];
  const Icon = config.icon;
  const translationKey = variant;

  const resolvedTitle = title ?? t(`${translationKey}.title`);
  const resolvedDescription = description ?? t(`${translationKey}.description`);
  const resolvedActionLabel = actionLabel ?? (onAction ? t(`${translationKey}.action`) : undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "relative flex flex-col items-center gap-5 rounded-3xl px-10 py-12 text-center shadow-[0_30px_60px_rgba(12,14,28,0.28)]",
        config.background,
        className,
      )}
    >
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10",
          config.accent,
        )}
      >
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-9 w-9" />
        </motion.span>
      </motion.span>

      <div className="space-y-2">
        <p className="text-lg font-semibold tracking-tight">{resolvedTitle}</p>
        <p className="text-sm leading-relaxed text-white/70">{resolvedDescription}</p>
      </div>

      {onAction && resolvedActionLabel ? (
        <Button
          type="button"
          variant={variant === "error" ? "secondary" : "ghost"}
          className={cn(
            "rounded-full border border-white/15 px-6 py-2 text-sm transition hover:translate-y-[-2px]",
            variant === "error"
              ? "bg-white/15 text-white shadow-[0_12px_24px_rgba(225,29,72,0.25)] hover:bg-white/20"
              : "bg-white/10 text-neutral-100 hover:bg-white/16",
          )}
          onClick={onAction}
          disabled={actionDisabled}
        >
          {resolvedActionLabel}
        </Button>
      ) : null}
    </motion.div>
  );
};
