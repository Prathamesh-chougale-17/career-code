# Careeright

Careeright is a career operating system for developers and job seekers. It brings job discovery, application tracking, interview preparation, DSA progress, daily reflection, AI-assisted task planning, friend sharing, and desktop/mobile access into one authenticated workspace.

The product is built as a monorepo with a production Next.js web app, an Expo mobile app, a Tauri desktop app, shared dashboard UI, typed API/domain packages, and an MCP server so AI clients can safely work with a user's Careeright data.

## What The App Does

Careeright helps a user manage the full job-search loop:

- Track job opportunities by date, source, status, fit score, apply URL, company, role, location, and notes.
- Move work across a Kanban board for job search tasks, application follow-ups, learning work, and AI-generated proposals.
- Maintain a career profile with basics, experience, projects, education, skills, certifications, resume import review, and application defaults.
- Use MCP tools from AI clients to list jobs, seed ranked jobs, prepare application runs, propose task changes, and import structured profile data.
- Save daily diary intervals and completion status for reflection and consistency tracking.
- Track DSA topics, subtopics, question completion, video progress, and activity history.
- View analytics for workspace health, profile readiness, board progress, diary activity, jobs, proposals, and MCP access.
- Connect with friends by exact email, send and accept requests, share read-only job snapshots, and copy shared jobs into a personal tracker.
- Compare friendly progress on the leaderboard using 30-day DSA and job-application activity charts.
- Use the same dashboard UI on web and desktop through shared shadcn-based components.

## Main Screens

### Dashboard

The dashboard gives a compact view of workspace health. It summarizes jobs, board tasks, diary activity, profile completeness, MCP tokens, proposals, and recent activity with cards and charts.

### Board

The board is a Kanban workspace for career tasks. Users can create, edit, delete, reorder, and move tasks across columns. AI clients can propose changes through MCP, but destructive or state-changing proposals are accepted inside the app UI.

### Jobs

The jobs tracker stores opportunities and application progress. It supports status updates, filtering, job fit scoring, date-based batches, external links, Excel export, job search profile settings, digests, and application automation run history.

### Diary

The diary lets users write daily intervals, mark entries as draft or complete, navigate dates, and review consistency over time.

### DSA

The DSA tracker shows tracks, subtopics, questions, completion counts, video watch progress, and a more gamified learning journey. It is designed to make progress visible at both subtopic and question level.

### History

History shows recent DSA and job activity over the last 30 days so users can see what they have actually done, not only what is planned.

### Proposals

The proposals screen is where AI-generated task suggestions, task updates, task deletes, work-start proposals, and profile imports are reviewed. Users stay in control before anything important is applied.

### MCP Tools

MCP tools let a user create and revoke tokens for AI clients. Tokens scope external MCP access to the signed-in user and expose safe tools for jobs, board tasks, profile snapshots, proposal creation, and application automation support.

### Profile

The profile screen stores career basics, application defaults, resume-derived profile items, job-search preferences, and pending import review. This data powers job ranking and application assistance.

### Friends

Friends lets users connect only through exact email search. A user can send a request, accept or reject incoming requests, remove friends, share job snapshots, revoke shares, and copy received jobs into their own tracker.

### Leaderboard

Leaderboard ranks the current user against accepted friends using recent DSA and job activity. It includes comparison tables and line charts for the last 30 days.

### Download

The web app exposes a `/download` page that lists the latest desktop installers from GitHub releases for Windows, macOS, and Linux.

## Apps

```text
apps/
  web/       Next.js production web app
  native/    Expo mobile app
  desktop/   Tauri desktop app
```

### Web

The web app is the primary production surface at:

```text
https://careeright.vercel.app
```

It uses Next.js App Router, React, TypeScript, Tailwind CSS v4, Turbopack, Better Auth, Google OAuth, oRPC, TanStack Query, and the shared `@repo/ui` dashboard components.

Run it locally:

```bash
pnpm --filter web dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/dashboard
```

### Native

The native app is an Expo app for Android and iOS. It uses Expo Router, Better Auth Expo integration, SecureStore, TanStack Query, FlashList, haptics, document picker, native safe-area handling, and shared Careeright API/domain packages.

Run it locally:

```bash
pnpm --filter native dev
```

Build a preview APK with EAS:

```bash
eas build --platform android --profile preview
```

### Desktop

The desktop app is a Tauri v2 React/Vite app. It uses the same shared dashboard UI as web, but authenticates through a desktop OAuth bridge and calls the deployed backend with a bearer desktop token.

Desktop features include:

- Google sign-in through the system browser.
- Deep-link callback with `careeright-desktop://`.
- Token persistence through Tauri Store.
- Shared dashboard routes and shadcn UI.
- GitHub release based updater.
- Optional launch-at-startup support.
- Windows, macOS, and Linux bundles.

Run it locally:

```bash
pnpm --filter @careeright/desktop tauri:dev
```

Build desktop installers:

```bash
pnpm --filter @careeright/desktop tauri:build
```

## Packages

```text
packages/
  api/               Typed oRPC client, router wiring, query keys
  auth/              Better Auth setup, desktop auth bridge helpers
  careeright-mcp/    Distributable stdio MCP proxy package
  db/                MongoDB client and collection helpers
  domain/            Zod schemas, stores, business rules, matching logic
  eslint-config/     Shared ESLint config
  inngest/           Background job and AI workflow integration
  jobs/              Job seeding, application, cleanup scripts
  mcp/               Careeright MCP server implementation
  typescript-config/ Shared TypeScript configs
  ui/                Shared shadcn UI primitives and dashboard screens
```

`packages/ui` is the source of truth for dashboard UI used by both web and desktop. Platform-specific code stays in app adapters.

## Tech Stack

- Next.js 16 App Router with Turbopack
- React 19 and TypeScript
- Tailwind CSS v4
- shadcn-style components in `@repo/ui`
- Base UI, lucide icons, Recharts, TanStack Table, TanStack Query
- oRPC for typed app APIs
- Better Auth with Google OAuth and MongoDB adapter
- MongoDB Atlas or local memory fallback for development-only data
- Expo SDK 55 for native mobile
- Tauri v2 for desktop
- MCP TypeScript SDK for AI client integrations
- Vercel AI SDK structured output for task proposal generation
- Inngest for background proposal processing
- Turborepo for workspace orchestration and remote cache

## Authentication

Careeright is user-scoped. Web and native use Better Auth sessions. Desktop uses a short-lived OAuth bridge that exchanges a browser-authenticated completion code for a desktop bearer token.

Required production auth environment:

```text
MONGODB_URI=
MONGODB_DB=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://careeright.vercel.app
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Supported aliases:

```text
CAREERIGHT_AUTH_SECRET=
CAREERIGHT_AUTH_URL=
```

Local Google OAuth redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Production Google OAuth redirect URI:

```text
https://careeright.vercel.app/api/auth/callback/google
```

Desktop sign-in routes:

```text
GET  /desktop-auth/start?state=<state>
GET  /desktop-auth/complete?state=<state>
POST /api/desktop-auth/exchange
POST /api/desktop-auth/revoke
```

## Environment Variables

Core app variables:

```text
MONGODB_URI=
MONGODB_DB=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AI_TASK_MODEL=
```

Native public app URL:

```text
EXPO_PUBLIC_CAREERIGHT_URL=https://careeright.vercel.app
```

Desktop backend URL:

```text
VITE_CAREERIGHT_URL=https://careeright.vercel.app
```

MCP variables:

```text
CAREERIGHT_MCP_URL=https://careeright.vercel.app/mcp
CAREERIGHT_MCP_TOKEN=<user-token-from-mcp-tools>
```

Turbo remote cache variables for CI:

```text
TURBO_TOKEN=<Vercel access token>
TURBO_TEAM=<Vercel team slug>
```

## Running Locally

Install dependencies:

```bash
pnpm install
```

Run every app that has a dev script:

```bash
pnpm dev
```

Run only the web app:

```bash
pnpm --filter web dev
```

Run only the desktop frontend:

```bash
pnpm --filter @careeright/desktop dev
```

Run the full Tauri desktop app:

```bash
pnpm --filter @careeright/desktop tauri:dev
```

Run the Expo app:

```bash
pnpm --filter native dev
```

Without `MONGODB_URI`, some local development can run against the memory store. Google OAuth and production-like user sessions require MongoDB.

## Quality Commands

Run checks across the workspace:

```bash
pnpm run lint
pnpm run check-types
pnpm run test
pnpm run build
```

Common targeted checks:

```bash
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web build
pnpm --filter @repo/ui check-types
pnpm --filter @careeright/desktop check-types
pnpm --filter @careeright/desktop build
```

Run Rust checks for desktop:

```bash
cd apps/desktop/src-tauri
cargo check
```

## MCP

Careeright exposes a remote MCP endpoint:

```text
https://careeright.vercel.app/mcp
```

HTTP MCP clients must send:

```text
Authorization: Bearer <user-token>
```

Create a token in:

```text
/dashboard/mcp-tools
```

Run the local stdio MCP server from this repo:

```bash
CAREERIGHT_MCP_TOKEN=<user-token> pnpm run mcp
```

Build the distributable stdio bridge package:

```bash
pnpm run mcp:package:build
node packages/careeright-mcp/dist/stdio-proxy.js
```

After publishing to npm, stdio MCP clients can run:

```bash
npx careeright-mcp
```

Claude Desktop, Claude Code-style clients, Codex-style local clients, and Gemini CLI can use the npm package as a local stdio MCP bridge. Remote-capable MCP clients should connect directly to:

```text
https://careeright.vercel.app/mcp
```

Available MCP tools include:

- `list_boards`
- `list_tasks`
- `get_task`
- `get_profile_snapshot`
- `prepare_task_breakdown_prompt`
- `propose_task_breakdown_from_tasks`
- `propose_task_update`
- `propose_task_delete`
- `propose_start_work`
- `propose_profile_import`
- `list_jobs`
- `seed_jobs`
- `get_job_search_profile`
- `prepare_job_search_brief`
- `score_job_candidates`
- `seed_ranked_jobs`
- `list_job_digests`
- `get_latest_unapplied_job_batch`
- `create_job_application_run`
- `list_job_application_runs`
- `update_job_application_attempt`

MCP tools are intentionally scoped. They can prepare proposals and read user-authorized data, but sensitive mutations remain user-controlled through the app.

## Job Application Automation

Careeright supports an MCP-driven Chrome application workflow for the latest not-applied job batch.

Before using it:

1. Save application defaults on `/dashboard/profile`.
2. Create an MCP token on `/dashboard/mcp-tools`.
3. Use the prompt at `prompts/latest-batch-chrome-job-apply.md`.

The automation prompt tells Codex or another AI client to:

- Fetch the latest not-applied batch through MCP.
- Use Chrome only for external application pages.
- Create a Careeright application run.
- Update attempt outcomes through MCP.
- Mark CAPTCHA, login-heavy, LinkedIn, Workday, Lever, Greenhouse, or ambiguous portals for manual review instead of forcing submission.

## Resume Profile Import

Careeright does not parse resume files inside MCP. The recommended flow is:

1. Give the resume PDF, document, or text to the external AI app.
2. Ask the AI app to extract structured profile data.
3. Call `propose_profile_import`.
4. Review and apply the pending import in `/dashboard/profile`.

Example external AI prompt:

```text
Parse this resume and call Careeright MCP `propose_profile_import` with profileBasics and items. Use item types experience, education, project, skill, and certification. Do not invent missing dates or links.
```

Expected input shape:

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

Applying an import fills empty basic fields and adds new profile items without deleting existing profile data.

## Desktop Releases

Desktop releases are built by GitHub Actions when a `desktop-v*` tag is pushed.

Create a new desktop release:

```bash
git tag -a desktop-v1.0.11 -m "Careeright Desktop 1.0.11"
git push origin desktop-v1.0.11
```

The workflow builds and publishes installers for:

- Windows
- macOS
- Linux

The Tauri updater reads the latest release artifact from:

```text
https://github.com/Prathamesh-chougale-17/career-code/releases/latest/download/latest.json
```

Required GitHub secrets for signed updater artifacts:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

Optional platform signing and notarization secrets can be added later for fully trusted Windows and macOS distribution.

## Mobile Releases

The Android app uses EAS builds. Typical commands:

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```

Google Play production access may require a closed testing period with enough opted-in testers depending on the Play Console account status.

## Build Cache

Careeright uses Turborepo for workspace builds. Next.js builds run with Turbopack, and `turbo.json` enables remote caching when Turbo is authenticated.

Set up local remote cache:

```bash
pnpm exec turbo login
pnpm exec turbo link
```

Set up GitHub Actions remote cache:

```text
TURBO_TOKEN=<Vercel access token>
TURBO_TEAM=<Vercel team slug>
```

## Data And Privacy

Careeright stores user-specific career data such as email, profile basics, job tracker entries, board tasks, diary entries, DSA progress, MCP tokens, friend connections, and shared job snapshots.

Security principles:

- Authenticated routes are user-scoped.
- Desktop tokens are bearer sessions separate from web cookies.
- MCP tokens are created by the user and can be revoked.
- Friend search is exact email based.
- Shared jobs are read-only snapshots for the receiver.
- Copying shared jobs creates independent jobs for the receiver.
- AI proposal flows avoid silent destructive changes.

Public policy pages:

```text
/privacy
/data-deletion
```

## Legacy Cleanup

After enabling authentication, remove old unauthenticated `solo-user` data once:

```bash
pnpm run cleanup:solo-user
```

## Useful Links

- Production app: `https://careeright.vercel.app`
- Dashboard: `https://careeright.vercel.app/dashboard`
- Desktop downloads: `https://careeright.vercel.app/download`
- Remote MCP endpoint: `https://careeright.vercel.app/mcp`
