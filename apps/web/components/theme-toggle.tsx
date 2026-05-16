"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@repo/ui/components/ui/button";
import { useCareerightTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { forcedTheme, resolvedTheme, setTheme } = useCareerightTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      disabled={Boolean(forcedTheme)}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative rounded-full border border-border bg-background shadow-sm"
    >
      <Sun
        className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0"
        aria-hidden="true"
      />
      <Moon
        className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100"
        aria-hidden="true"
      />
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
}

