import { LogOut } from "lucide-react";

import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";

export function UserAccountMenu({
  className,
  onSignOut,
}: {
  className?: string;
  onSignOut: () => void;
}) {
  return (
    <Button
      variant="outline"
      className={cn("w-full justify-start", className)}
      onClick={onSignOut}
      type="button"
    >
      <LogOut data-icon="inline-start" aria-hidden="true" />
      Sign out
    </Button>
  );
}

