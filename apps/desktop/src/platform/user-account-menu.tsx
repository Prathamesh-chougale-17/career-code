import { Loader2, LogOut, Power, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@repo/ui/components/ui/button";
import { Switch } from "@repo/ui/components/ui/switch";
import { cn } from "@repo/ui/lib/utils";

import { getAutostartEnabled, setAutostartEnabled } from "../lib/autostart";
import type { DesktopSession } from "../lib/auth";

export function UserAccountMenu({
  className,
  onSignOut,
  user,
}: {
  className?: string;
  onSignOut: () => void;
  user?: DesktopSession["user"] | null;
}) {
  const displayName = user?.name || "Careeright user";
  const displayEmail = user?.email || user?.id || "Signed in";
  const [startupEnabled, setStartupEnabled] = useState(false);
  const [isStartupLoading, setIsStartupLoading] = useState(true);
  const [startupError, setStartupError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function refreshStartupState() {
      setIsStartupLoading(true);

      try {
        const enabled = await getAutostartEnabled();

        if (mounted) {
          setStartupEnabled(enabled);
          setStartupError("");
        }
      } catch (error) {
        if (mounted) {
          setStartupError(getErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setIsStartupLoading(false);
        }
      }
    }

    void refreshStartupState();
    window.addEventListener("careeright:autostart-changed", refreshStartupState);

    return () => {
      mounted = false;
      window.removeEventListener(
        "careeright:autostart-changed",
        refreshStartupState,
      );
    };
  }, []);

  async function handleStartupChange(enabled: boolean) {
    setStartupEnabled(enabled);
    setIsStartupLoading(true);
    setStartupError("");

    try {
      const nextEnabled = await setAutostartEnabled(enabled);
      setStartupEnabled(nextEnabled);
    } catch (error) {
      setStartupEnabled(!enabled);
      setStartupError(getErrorMessage(error));
    } finally {
      setIsStartupLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg border border-sidebar-border bg-background/70 p-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 px-1">
        <UserCircle className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {displayEmail}
          </p>
        </div>
      </div>
      <div className="rounded-md border border-sidebar-border bg-muted/30 p-2">
        <div className="flex items-center gap-2">
          <Power className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">
              Launch at startup
            </p>
            <p className="text-[11px] leading-4 text-muted-foreground">
              Open Careeright when this computer starts.
            </p>
          </div>
          {isStartupLoading ? (
            <Loader2
              className="size-4 shrink-0 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          ) : null}
          <Switch
            aria-label="Launch Careeright at startup"
            checked={startupEnabled}
            disabled={isStartupLoading}
            onCheckedChange={handleStartupChange}
          />
        </div>
        {startupError ? (
          <p className="mt-2 text-[11px] leading-4 text-destructive">
            {startupError}
          </p>
        ) : null}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onSignOut}
        type="button"
      >
        <LogOut data-icon="inline-start" aria-hidden="true" />
        Sign out
      </Button>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Startup setting failed.";
}

