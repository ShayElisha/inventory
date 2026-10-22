"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--surface-2)]",
        className
      )}
      title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
      aria-label={theme === "dark" ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-[var(--lime)]" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
