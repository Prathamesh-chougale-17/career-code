"use client";

import { Loader2, LogIn } from "lucide-react";
import { useState } from "react";

import { CareerightLogo } from "@/components/brand/careeright-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export function SignInCard({ callbackURL }: { callbackURL: string }) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError(null);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      if (result.error) {
        setError(result.error.message ?? "Google sign-in failed.");
        setIsSigningIn(false);
      }
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Google sign-in failed.",
      );
      setIsSigningIn(false);
    }
  }

  return (
    <Card size="sm" className="w-full max-w-md rounded-xl">
      <CardHeader className="gap-3">
        <CareerightLogo className="size-12" sizes="48px" />
        <div className="grid gap-1.5">
          <CardTitle className="text-2xl">Sign in to Careeright</CardTitle>
          <CardDescription>
            Use your Google account to open your personal board, proposals, and
            MCP tokens.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          type="button"
          size="lg"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full"
        >
          {isSigningIn ? (
            <Loader2
              data-icon="inline-start"
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <LogIn data-icon="inline-start" aria-hidden="true" />
          )}
          Continue with Google
        </Button>
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
