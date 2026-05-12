import { getAuth } from "@career-code/auth/server";

export const runtime = "nodejs";

async function handler(request: Request) {
  try {
    const auth = await getAuth();
    return auth?.handler(request);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Auth is not configured for this environment.",
      },
      { status: 503 },
    );
  }
}

export { handler as GET, handler as POST };
