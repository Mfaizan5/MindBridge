"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { cn } from "@/lib/utils";

// The page's theme is the "dark" class on <html>, set before first paint by the script in app/layout.tsx.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

// Shows the other mode, so the icon and label describe what the button will do.
export function ThemeToggle({
  showLabel = false,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  // The server has no document, so it renders the light labels; the client reads the real theme.
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage can be blocked (private browsing); the choice still applies for this visit.
    }
  };

  const label = dark ? "Light mode" : "Dark mode";
  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-navy/5",
        !showLabel && "min-w-11 justify-center rounded-full px-0",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {showLabel && label}
    </button>
  );
}
