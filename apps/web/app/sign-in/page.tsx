import { redirect } from "next/navigation";

import { SignInCard } from "@/components/auth/sign-in-card";
import { CareerightLogo } from "@/components/brand/careeright-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSessionFromServerHeaders,
  normalizeAuthCallbackPath,
} from "@/lib/auth/session";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    authError?: string | string[];
    callbackURL?: string | string[];
  }>;
}) {
  const { authError, callbackURL } = await searchParams;
  const safeCallbackURL = normalizeAuthCallbackPath(callbackURL, "/dashboard");
  const hasConfigurationError =
    (Array.isArray(authError) ? authError[0] : authError) ===
    "configuration";
  const hasGoogleOAuthConfig = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  let setupError: string | null = hasConfigurationError
    ? "Google OAuth or MongoDB auth configuration is missing."
    : !hasGoogleOAuthConfig
      ? "Google OAuth is not configured. Demo storage can run without MongoDB, but sign-in still needs Google OAuth credentials."
    : null;

  if (!setupError) {
    let session: Awaited<ReturnType<typeof getSessionFromServerHeaders>> = null;

    try {
      session = await getSessionFromServerHeaders();
    } catch (error) {
      setupError =
        error instanceof Error
          ? error.message
          : "Google OAuth or MongoDB auth configuration is missing.";
    }

    if (session?.user) {
      redirect(safeCallbackURL);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
      {setupError ? (
        <AuthSetupCard message={setupError} />
      ) : (
        <SignInCard callbackURL={safeCallbackURL} />
      )}
    </main>
  );
}

function AuthSetupCard({ message }: { message: string }) {
  return (
    <Card size="sm" className="w-full max-w-md rounded-xl">
      <CardHeader className="gap-3">
        <CareerightLogo className="size-12" sizes="48px" />
        <div className="grid gap-1.5">
          <CardTitle className="text-2xl">Auth setup required</CardTitle>
          <CardDescription>
            Careeright now uses Google OAuth for user-specific boards and MCP tokens.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
        <p>{message}</p>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          Configure <code>GOOGLE_CLIENT_ID</code>,{" "}
          <code>GOOGLE_CLIENT_SECRET</code>, and optionally{" "}
          <code>CAREERIGHT_AUTH_SECRET</code>, <code>CAREERIGHT_AUTH_URL</code>,{" "}
          and <code>MONGODB_URI</code>.
        </div>
      </CardContent>
    </Card>
  );
}
