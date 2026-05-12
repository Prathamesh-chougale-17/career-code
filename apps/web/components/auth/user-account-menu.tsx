"use client";

import { Loader2, LogOut, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type ClientSession = {
  user?: {
    email?: string | null;
    name?: string | null;
  };
} | null;

export function UserAccountMenu({ className }: { className?: string }) {
  const [session, setSession] = useState<ClientSession>(null);
  const [isPending, setIsPending] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    authClient
      .getSession()
      .then((result) => {
        if (isMounted) {
          setSession((result.data as ClientSession) ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsPending(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    window.location.assign("/");
  }

  if (isPending) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-sidebar-border bg-background/70 px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        <span>Loading user</span>
      </div>
    );
  }

  if (!session?.user) {
    return null;
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
            {session.user.name || "Careeright user"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {session.user.email}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="w-full"
      >
        {isSigningOut ? (
          <Loader2
            data-icon="inline-start"
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          <LogOut data-icon="inline-start" aria-hidden="true" />
        )}
        Sign out
      </Button>
    </div>
  );
}
