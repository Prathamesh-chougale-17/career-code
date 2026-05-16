import { Moon, Sun } from "lucide-react";

import { Button } from "@repo/ui/components/ui/button";

export function ThemeToggle({
  theme,
  onThemeChange,
}: {
  theme: "light" | "dark";
  onThemeChange: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onThemeChange}
      title="Toggle theme"
      type="button"
    >
      {theme === "dark" ? <Sun /> : <Moon />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

