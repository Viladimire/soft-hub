"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";

const ICON_SIZE = "h-4 w-4";

export const ThemeToggle = () => {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();

  const isDark = useMemo(() => {
    const effectiveTheme = resolvedTheme ?? systemTheme ?? "light";
    return effectiveTheme === "dark";
  }, [resolvedTheme, systemTheme]);

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9 rounded-full border border-white/10 text-neutral-100 transition hover:border-white/30 hover:bg-white/10"
      onClick={handleToggle}
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>{isDark ? <Sun className={ICON_SIZE} /> : <Moon className={ICON_SIZE} />}</span>
    </Button>
  );
};

export default ThemeToggle;
