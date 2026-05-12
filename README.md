# Careeright

Careeright is a user-specific AI-to-Kanban workspace. The web app uses typed oRPC procedures for normal product interactions, while MCP exposes safe AI-client tools that create proposals instead of directly mutating destructive board state.

## Stack

- Next.js App Router, React, TypeScript, Tailwind v4, next-themes
- oRPC for app APIs
- TanStack Query for client data refresh
- MongoDB Node driver, with an empty local memory store when `MONGODB_URI` is not set
- Better Auth with MongoDB adapter and Google OAuth
- Vercel AI SDK structured output for task breakdowns
- MCP TypeScript SDK for `/mcp` and `pnpm run mcp`
- Inngest route for background AI proposal processing

## Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) for the public landing page,
then use [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for
the signed-in workspace.

Configure `MONGODB_URI`, optional `MONGODB_DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` before signing in. `CAREERIGHT_AUTH_SECRET` and `CAREERIGHT_AUTH_URL` are also supported as aliases. For Vercel production, set `BETTER_AUTH_URL=https://careeright.vercel.app`; for local Google OAuth, keep it on `http://localhost:3000`. Without `MONGODB_URI`, the app can still run in local memory mode for development, but Google OAuth requires MongoDB-backed Better Auth. Set `AI_TASK_MODEL` before using app-generated AI task breakdown proposals; MCP structured proposal ingestion does not call the backend model.

Google OAuth redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

## MCP

HTTP MCP endpoint:

```text
https://careeright.vercel.app/mcp
```

Local stdio MCP server:

```bash
CAREERIGHT_MCP_TOKEN=<user-token> pnpm run mcp
```

Distributable stdio bridge package for external MCP clients:

```bash
pnpm run mcp:package:build
node packages/careeright-mcp/dist/stdio-proxy.js
```

Create a user MCP token from `/dashboard/mcp-tools`. HTTP clients must send `Authorization: Bearer <user-token>` to `/mcp`; stdio clients must set `CAREERIGHT_MCP_TOKEN`. The old global `KANBAN_MCP_TOKEN` flow is no longer supported.

The package lives at `packages/careeright-mcp`. It proxies stdio MCP traffic to `CAREERIGHT_MCP_URL` (default `https://careeright.vercel.app/mcp`) and keeps all data writes scoped to the token owner.

After publishing to npm, stdio MCP clients can run it with `npx careeright-mcp`.

Claude Desktop, Claude Code, Codex-style local clients, and Gemini CLI can use the npm package as a local stdio MCP server. ChatGPT custom connectors use remote MCP endpoints, so connect ChatGPT to `https://careeright.vercel.app/mcp` rather than the local npm package.

Publish the MCP package after logging into npm:

```bash
npm login
pnpm run mcp:package:pack
pnpm run mcp:package:publish
```

Available tools include `list_boards`, `list_tasks`, `get_task`, `get_profile_snapshot`, `prepare_task_breakdown_prompt`, `propose_task_breakdown_from_tasks`, `propose_task_update`, `propose_task_delete`, `propose_start_work`, `propose_profile_import`, `list_jobs`, `seed_jobs`, `get_job_search_profile`, `prepare_job_search_brief`, `score_job_candidates`, `seed_ranked_jobs`, `list_job_digests`, `get_latest_unapplied_job_batch`, `create_job_application_run`, `list_job_application_runs`, and `update_job_application_attempt`. Proposal and profile-import acceptance still happens in the app UI by default.

### Latest-Batch Chrome Apply Automation

Save application defaults on `/dashboard/profile`, including phone, LinkedIn,
resume path, education details, source, and joining availability.

For production Codex users, use the standalone prompt at
`prompts/latest-batch-chrome-job-apply.md`. It tells Codex to fetch the latest
Not applied batch through Careeright MCP, then use Chrome only for external
application pages. It does not require localhost, terminal commands, repository
code, hidden DB access, or local scripts.

The production prompt is MCP-driven: it creates a Careeright application run, gets
the exact latest-batch apply links from MCP, and updates attempt outcomes through
MCP after Chrome fills or skips each form.
LinkedIn, Workday, Lever, Greenhouse, CAPTCHA/login-heavy, or ambiguous portals
should be recorded as manual review instead of being auto-filled.

### Resume Profile Import

Careeright does not parse resume files inside `/mcp`. Give the resume PDF, document, or text to the external AI app first, let that app extract structured profile data, then call `propose_profile_import`.

Example prompt for an external AI client:

```text
Parse this resume and call Careeright MCP `propose_profile_import` with profileBasics and items. Use item types experience, education, project, skill, and certification. Do not invent missing dates or links.
```

Expected MCP input shape:

```json
{
  "profileBasics": {
    "displayName": "Your Name",
    "headline": "Full-stack developer",
    "location": "India",
    "email": "you@example.com",
    "website": "https://example.com",
    "summary": "Short resume summary"
  },
  "summary": "Resume profile import",
  "items": [
    {
      "type": "experience",
      "title": "Frontend Developer",
      "organization": "Company",
      "location": "Remote",
      "startDate": "Jan 2024",
      "endDate": "Present",
      "description": "Built React and TypeScript interfaces.",
      "url": "https://example.com",
      "tags": ["React", "TypeScript"]
    }
  ]
}
```

The app shows pending resume imports on `/dashboard/profile`. Applying an import fills only empty basic fields and adds new section items without deleting existing profile data.

### AI Client Smoke Test

For stdio-based clients such as Claude Desktop, Claude Code-style clients, or any MCP client that accepts a command, add a server like this:

```json
{
  "mcpServers": {
    "habage": {
      "command": "node",
      "args": [
        "C:\\Users\\prath\\OneDrive\\Desktop\\study\\temp\\open-source\\habage\\packages\\careeright-mcp\\dist\\stdio-proxy.js"
      ],
      "env": {
        "CAREERIGHT_MCP_URL": "https://careeright.vercel.app/mcp",
        "CAREERIGHT_MCP_TOKEN": "<user-token-from-mcp-tools>"
      }
    }
  }
}
```

Restart the AI client, then ask it:

```text
Use the Careeright MCP tools. Call list_boards, then list_tasks for the board, then propose_start_work for one task.
```

Expected result: the app should show a pending proposal in the proposal library. The task should not silently move to `In Progress` until you accept the proposal in the UI.

For remote-capable MCP clients, use `https://careeright.vercel.app/mcp` with `Authorization: Bearer <user-token>`.

## Legacy cleanup

After enabling authentication, remove old unauthenticated `solo-user` data once:

```bash
pnpm run cleanup:solo-user
```

## Langfuse

Langfuse is an open-source observability platform for LLM apps. It helps trace prompts, model calls, tool calls, outputs, latency, token usage, cost, errors, and evaluations across AI workflows.

In Careeright, Langfuse would be useful for answering questions like: which prompt generated this task proposal, which model ran, how long it took, why it failed, and whether users accepted or rejected the result. It is optional; the app runs without Langfuse today.

## Quality

```bash
pnpm run lint
pnpm run test
pnpm run build
```
