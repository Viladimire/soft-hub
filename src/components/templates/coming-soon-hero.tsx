import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type ComingSoonAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
};

export type ComingSoonFeature = {
  title: string;
  items: string[];
  caption?: string;
};

export type ComingSoonInfoCard = {
  title: string;
  description: string;
  badge?: string;
  chips?: string[];
};

export type ComingSoonHeroProps = {
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  description: string;
  gradientClassName?: string;
  overlayClassName?: string;
  features?: ComingSoonFeature[];
  actions?: ComingSoonAction[];
  secondaryActions?: ComingSoonAction[];
  infoCards?: ComingSoonInfoCard[];
  footer?: ReactNode;
  className?: string;
};

const defaultGradient = "bg-gradient-to-br from-slate-900/70 via-neutral-950/75 to-slate-950/80";
const defaultOverlay = "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.25),transparent_62%)]";

export const ComingSoonHero = ({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  gradientClassName = defaultGradient,
  overlayClassName = defaultOverlay,
  features = [],
  actions = [],
  secondaryActions = [],
  infoCards = [],
  footer,
  className,
}: ComingSoonHeroProps) => {
  const hasActions = actions.length > 0 || secondaryActions.length > 0;
  const hasFeatures = features.length > 0;
  const hasInfoCards = infoCards.length > 0;

  return (
    <Card className={cn("relative overflow-hidden border-white/10", gradientClassName, className)}>
      <div className={cn("pointer-events-none absolute inset-0", overlayClassName)} aria-hidden="true" />
      <CardHeader className="relative space-y-3">
        {badge ? (
          <Badge className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/85">
            {BadgeIcon ? <BadgeIcon className="mr-2 h-3.5 w-3.5" /> : null}
            {badge}
          </Badge>
        ) : null}
        <CardTitle className="text-2xl font-bold text-white sm:text-3xl">{title}</CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-relaxed text-neutral-200 sm:text-base">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-6">
        {hasFeatures ? (
          <div className={cn("grid gap-4", features.length > 1 ? "sm:grid-cols-2" : "")}
          >
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/12 bg-white/5 p-4 text-sm text-neutral-200"
              >
                <p className="text-xs uppercase tracking-wide text-neutral-400">{feature.title}</p>
                <ul className="mt-2 space-y-2">
                  {feature.items.map((item, index) => (
                    <li key={`${feature.title}-${index}`}>• {item}</li>
                  ))}
                </ul>
                {feature.caption ? (
                  <p className="mt-3 text-xs text-neutral-400">{feature.caption}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {hasActions ? (
          <div className="flex flex-wrap items-center gap-3">
            {actions.map(({ label, href, variant = "secondary", icon: Icon, iconPosition = "right" }) => (
              <Button key={label} asChild variant={variant} className="rounded-full px-6">
                <Link href={href} className="flex items-center gap-2">
                  {Icon && iconPosition === "left" ? <Icon className="h-4 w-4" /> : null}
                  {label}
                  {Icon && iconPosition === "right" ? <Icon className="h-4 w-4" /> : null}
                </Link>
              </Button>
            ))}
            {secondaryActions.map(({ label, href, variant = "ghost", icon: Icon, iconPosition = "right" }) => (
              <Button key={label} asChild variant={variant} className="rounded-full px-6 text-neutral-100 hover:border-white/40 hover:bg-white/10">
                <Link href={href} className="flex items-center gap-2">
                  {Icon && iconPosition === "left" ? <Icon className="h-4 w-4" /> : null}
                  {label}
                  {Icon && iconPosition === "right" ? <Icon className="h-4 w-4" /> : null}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}

        {hasInfoCards ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {infoCards.map((infoCard) => (
              <div
                key={infoCard.title}
                className="rounded-2xl border border-white/12 bg-white/6 p-4 text-sm text-neutral-200 transition hover:border-white/30 hover:bg-white/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{infoCard.title}</p>
                  {infoCard.badge ? (
                    <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {infoCard.badge}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-neutral-300">{infoCard.description}</p>
                {infoCard.chips?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-200">
                    {infoCard.chips.map((chip) => (
                      <span key={`${infoCard.title}-${chip}`} className="rounded-full border border-white/18 bg-white/8 px-3 py-1">
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {footer ? <div className="pt-2 text-sm text-neutral-300">{footer}</div> : null}
      </CardContent>
    </Card>
  );
};
