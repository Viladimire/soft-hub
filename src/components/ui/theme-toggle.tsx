"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const ICON_SIZE = "h-4 w-4";

export const ThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, systemTheme, setTheme } = useTheme();

  const effectiveTheme = resolvedTheme ?? systemTheme ?? "light";
  const isDark = effectiveTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      className="h-9 w-9 rounded-full border border-white/10 text-neutral-100 transition hover:border-white/30 hover:bg-white/10"
      onClick={handleToggle}
      disabled={!mounted}
    >
      {mounted && isDark ? <Sun className={ICON_SIZE} /> : <Moon className={ICON_SIZE} />}
    </Button>
  );
};

export default ThemeToggle;
