import { LogOut, UserCircle } from "lucide-react";

import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";

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

