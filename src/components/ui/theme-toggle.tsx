"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const ICON_SIZE = "h-4 w-4";

let hasMountedStore = false;
const hasMountedListeners = new Set<() => void>();

const useHasMounted = () => {
  const mounted = useSyncExternalStore(
    (onStoreChange) => {
      hasMountedListeners.add(onStoreChange);
      return () => {
        hasMountedListeners.delete(onStoreChange);
      };
    },
    () => hasMountedStore,
    () => false,
  );

  useEffect(() => {
    if (hasMountedStore) return;
    hasMountedStore = true;
    hasMountedListeners.forEach((listener) => listener());
  }, []);

  return mounted;
};

export const ThemeToggle = () => {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();
  const mounted = useHasMounted();

  const isDark = useMemo(() => {
    if (!mounted) return true;
    const effectiveTheme = resolvedTheme ?? systemTheme ?? "dark";
    return effectiveTheme === "dark";
  }, [mounted, resolvedTheme, systemTheme]);

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9 rounded-full border border-black/10 bg-black/5 text-neutral-800 transition hover:border-black/20 hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:hover:border-white/30 dark:hover:bg-white/10"
      onClick={handleToggle}
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>{isDark ? <Sun className={ICON_SIZE} /> : <Moon className={ICON_SIZE} />}</span>
    </Button>
  );
};

export default ThemeToggle;
