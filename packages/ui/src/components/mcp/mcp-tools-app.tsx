"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Database,
  FileJson,
  KeyRound,
  ListChecks,
  Loader2,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import type { McpTokenView } from "@careeright/domain/kanban/schema";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import { mcpTokensQueryKey } from "@careeright/api/query-keys";

type ToolDetail = {
  name: string;
  mode: string;
  description: string;
};

const connectionDetails = [
  {
    label: "HTTP endpoint",
    value: "https://careeright.vercel.app/mcp",
    description:
      "Use this with Authorization: Bearer <Careeright user MCP token>.",
    icon: <Server aria-hidden="true" />,
  },
  {
    label: "Stdio command",
    value: "npx -y careeright-mcp",
    description: "Use this package with CAREERIGHT_MCP_TOKEN for local stdio clients.",
    icon: <Terminal aria-hidden="true" />,
  },
  {
    label: "Board resource",
    value: "careeright://boards/default/snapshot",
    description: "Read the current board, columns, cards, and pending proposals.",
    icon: <FileJson aria-hidden="true" />,
  },
  {
    label: "Profile resource",
    value: "careeright://profile/snapshot",
    description: "Read profile basics, saved items, and pending resume imports.",
    icon: <FileJson aria-hidden="true" />,
  },
  {
    label: "Projects resource",
    value: "careeright://projects/overview",
    description: "Read project workspace summary, resources, and references.",
    icon: <FileJson aria-hidden="true" />,
  },
  {
    label: "Job search resource",
    value: "careeright://jobs/search-profile",
    description: "Read profile-derived job search settings and ranking limits.",
    icon: <FileJson aria-hidden="true" />,
  },
  {
    label: "Latest job digest",
    value: "careeright://jobs/latest-digest",
    description: "Read the latest ranked job curation summary.",
    icon: <FileJson aria-hidden="true" />,
  },
] as const;

const mcpTools: ToolDetail[] = [
  {
    name: "prepare_task_breakdown_prompt",
    mode: "read",
    description:
      "Analyze a raw prompt and return clarification questions when the prompt is too weak or ambiguous. This does not create proposals or call AI_TASK_MODEL.",
  },
  {
    name: "propose_task_breakdown_from_tasks",
    mode: "structured proposal",
    description:
      "Recommended path for ChatGPT, Codex, Claude, and Gemini clients: generate tasks externally, then submit them as a pending task_breakdown proposal.",
  },
  {
    name: "propose_task_update",
    mode: "pending edit",
    description:
      "Suggest title, description, priority, or column changes for an existing card without mutating the board immediately.",
  },
  {
    name: "propose_task_delete",
    mode: "pending delete",
    description:
      "Suggest deleting a card. The delete only happens after the user accepts the proposal.",
  },
  {
    name: "propose_start_work",
    mode: "pending move",
    description:
      "Suggest moving an existing card into In Progress when the user chooses to start work.",
  },
  {
    name: "get_profile_snapshot",
    mode: "read",
    description:
      "Read the connected user's profile basics, saved profile items, and pending resume imports.",
  },
  {
    name: "prepare_job_search_brief",
    mode: "read",
    description:
      "Return profile-derived job search keywords, location strategy, exclusions, minimum score, and max seeded count for automation.",
  },
  {
    name: "score_job_candidates",
    mode: "read",
    description:
      "Score normalized external job candidates against the saved job search profile without writing rows.",
  },
  {
    name: "seed_ranked_jobs",
    mode: "ranked upsert",
    description:
      "Score, dedupe, enforce the 75+ / top-25 run limits, seed accepted jobs, and create a curation digest.",
  },
  {
    name: "get_job_search_profile",
    mode: "read",
    description:
      "Read the connected user's editable job search profile used by ranked job automation.",
  },
  {
    name: "list_job_digests",
    mode: "read",
    description: "Read recent ranked job curation summaries.",
  },
  {
    name: "seed_jobs",
    mode: "direct upsert",
    description:
      "Upsert external job listings into the job tracker. Careeright dedupes by source job ID, apply URL, then normalized role/company/location.",
  },
  {
    name: "list_jobs",
    mode: "read",
    description:
      "Read MCP-seeded jobs from the connected user's tracker, newest seeded date first.",
  },
  {
    name: "get_projects_summary",
    mode: "read",
    description:
      "Read project workspace counts, notebook totals, resources, references, and resume-project import readiness.",
  },
  {
    name: "list_projects",
    mode: "read",
    description:
      "List project workspaces with metadata, resource links, and clickable reference attributes.",
  },
  {
    name: "get_project",
    mode: "read",
    description:
      "Fetch one project workspace with every markdown notebook page, resource, and reference.",
  },
  {
    name: "create_project",
    mode: "direct write",
    description:
      "Create a project workspace for markdown notes, Mermaid diagrams, resources, and references.",
  },
  {
    name: "update_project",
    mode: "direct update",
    description:
      "Update project metadata such as title, summary, stack, status, and timeline without overwriting notes.",
  },
  {
    name: "archive_project",
    mode: "direct update",
    description: "Archive a project workspace while keeping its stored data.",
  },
  {
    name: "delete_project",
    mode: "destructive",
    description:
      "Soft-delete a project workspace after explicit user confirmation.",
  },
  {
    name: "import_projects_from_profile",
    mode: "idempotent write",
    description:
      "Create project workspaces from resume profile project items that are not already linked.",
  },
  {
    name: "sync_project_from_profile",
    mode: "idempotent update",
    description:
      "One-way sync linked resume project metadata while preserving notes, resources, and references.",
  },
  {
    name: "create_project_note",
    mode: "direct write",
    description:
      "Create a markdown notebook page. Fenced mermaid blocks render in the Projects tab.",
  },
  {
    name: "update_project_note",
    mode: "direct update",
    description: "Update a project notebook page title and/or markdown content.",
  },
  {
    name: "delete_project_note",
    mode: "destructive",
    description: "Delete a project notebook page after explicit user confirmation.",
  },
  {
    name: "reorder_project_notes",
    mode: "idempotent update",
    description: "Replace notebook page order for a project.",
  },
  {
    name: "create_project_resource",
    mode: "direct write",
    description:
      "Add an HTTP/HTTPS repository, demo, documentation, article, video, design, or general link.",
  },
  {
    name: "update_project_resource",
    mode: "direct update",
    description: "Update a project resource title, URL, type, or note.",
  },
  {
    name: "delete_project_resource",
    mode: "destructive",
    description:
      "Delete a project resource and remove it from related references.",
  },
  {
    name: "create_project_attribute",
    mode: "direct write",
    description:
      "Create a project-scoped clickable reference term such as Kafka, Redis, or a launch date.",
  },
  {
    name: "update_project_attribute",
    mode: "direct update",
    description:
      "Update a clickable reference term, aliases, date details, description, or related resources.",
  },
  {
    name: "delete_project_attribute",
    mode: "destructive",
    description: "Delete a clickable project reference term.",
  },
  {
    name: "get_latest_unapplied_job_batch",
    mode: "read",
    description:
      "Fetch the newest seeded date's Not applied jobs with apply links, profile defaults, automation classification, and advice for Chrome filling.",
  },
  {
    name: "create_job_application_run",
    mode: "tracking write",
    description:
      "Create a latest-batch application run for Chrome automation without submitting applications or changing job status.",
  },
  {
    name: "list_job_application_runs",
    mode: "read",
    description:
      "Read recent Chrome application runs and per-job attempt outcomes.",
  },
  {
    name: "update_job_application_attempt",
    mode: "tracking update",
    description:
      "Record a per-job Chrome filling outcome such as filled_waiting_user, needs_manual_review, failed, or submitted_detected.",
  },
  {
    name: "propose_profile_import",
    mode: "pending profile import",
    description:
      "Submit structured resume data extracted by the external AI app. Careeright stores it as a pending profile import for review on the profile page.",
  },
  {
    name: "list_boards",
    mode: "read",
    description: "List boards visible to the connected user.",
  },
  {
    name: "list_tasks",
    mode: "read",
    description: "List cards for a board.",
  },
  {
    name: "get_task",
    mode: "read",
    description: "Fetch a card by task number or internal task ID.",
  },
];

const structuredTaskFields = [
  "title",
  "description",
  "priority",
  "acceptanceCriteria",
  "suggestedColumn",
  "dependencies",
  "resourceLinks",
  "helpfulLinks",
  "problemLinks",
] as const;

const proposalContextFields = [
  "prompt",
  "title",
  "summary",
  "refinedPrompt",
  "clarifications",
] as const;

const recommendedFlow = [
  "Call prepare_task_breakdown_prompt with the raw user request.",
  "If status is needs_clarification, ask the returned questions in the AI client.",
  "Call prepare_task_breakdown_prompt again with the collected clarifications if a second round may help.",
  "Generate the final task list from the prompt plus the user's answers.",
  "Submit the tasks with propose_task_breakdown_from_tasks.",
] as const;

export function McpToolsApp({
  initialTokens,
}: {
  initialTokens?: McpTokenView[];
}) {
  const { rpcClient } = useCareerightUi();
  const queryClient = useQueryClient();
  const [tokenName, setTokenName] = useState("Primary MCP token");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [pendingRevokeTokenIds, setPendingRevokeTokenIds] = useState<
    Set<string>
  >(() => new Set());
  const tokensQuery = useQuery({
    queryKey: mcpTokensQueryKey,
    queryFn: () => rpcClient.mcpToken.list(),
    initialData: initialTokens,
    notifyOnChangeProps: ["data", "isPending"],
    staleTime: 60_000,
  });
  const createTokenMutation = useMutation({
    mutationFn: (name: string) =>
      rpcClient.mcpToken.create({
        name: name.trim() || "MCP token",
      }),
    onSuccess: (result) => {
      setCreatedToken(result.token);
      setCopiedToken(false);
      void queryClient.invalidateQueries({ queryKey: mcpTokensQueryKey });
    },
  });
  const revokeTokenMutation = useMutation({
    mutationFn: (tokenId: string) =>
      rpcClient.mcpToken.revoke({
        tokenId,
      }),
    onMutate: (tokenId) => {
      setPendingRevokeTokenIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(tokenId);
        return nextIds;
      });
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: mcpTokensQueryKey }),
    onSettled: (_data, _error, tokenId) => {
      setPendingRevokeTokenIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(tokenId);
        return nextIds;
      });
    },
  });
  const tokens = tokensQuery.data ?? [];

  async function copyCreatedToken() {
    if (!createdToken) {
      return;
    }

    await navigator.clipboard.writeText(createdToken);
    setCopiedToken(true);
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">MCP tools</p>
          <p className="truncate text-xs text-muted-foreground">
            External AI clients create proposals, not direct board mutations
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-5">
          <McpTokenManager
            tokens={tokens}
            tokenName={tokenName}
            createdToken={createdToken}
            copiedToken={copiedToken}
            isLoading={tokensQuery.isPending}
            isCreating={createTokenMutation.isPending}
            revokingTokenIds={pendingRevokeTokenIds}
            onTokenNameChange={setTokenName}
            onCreateToken={() => createTokenMutation.mutate(tokenName)}
            onCopyToken={copyCreatedToken}
            onRevokeToken={(tokenId) => revokeTokenMutation.mutate(tokenId)}
          />

          <section className="grid min-w-0 gap-4 lg:grid-cols-3">
            {connectionDetails.map((item) => (
              <Card key={item.label} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span className="text-primary [&>svg]:size-4">
                      {item.icon}
                    </span>
                    {item.label}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="block overflow-x-auto rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-foreground">
                    {item.value}
                  </code>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Sparkles aria-hidden="true" />
                  </span>
                  Structured proposal ingestion
                </CardTitle>
                <CardDescription>
                  Use this when the MCP client has already generated the task
                  breakdown.
                </CardDescription>
                <CardAction>
                  <Badge variant="outline">recommended</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-sm font-medium">
                    propose_task_breakdown_from_tasks
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Required input is a prompt and a non-empty tasks array.
                    Optional title and summary become the proposal heading in
                    Careeright.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Recommended clarification flow
                  </p>
                  <ol className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                    {recommendedFlow.map((step, index) => (
                      <li key={step} className="flex gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs text-foreground">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="grid gap-3">
                  <FieldGroup
                    title="Proposal context fields"
                    fields={proposalContextFields}
                  />
                  <FieldGroup title="Task fields" fields={structuredTaskFields} />
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  Submitted tasks become a pending task_breakdown proposal in
                  the proposal library and review workflow. Todo cards are
                  created only after the user adds individual tasks or accepts
                  the proposal.
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  Link fields are optional arrays of{" "}
                  <code className="rounded bg-background px-1 py-0.5 text-xs text-foreground">
                    {"{ title?: string, url: string }"}
                  </code>{" "}
                  items. Only http and https URLs are accepted.
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  Clarification fields are optional. Use{" "}
                  <code className="rounded bg-background px-1 py-0.5 text-xs text-foreground">
                    refinedPrompt
                  </code>{" "}
                  for the final clarified request and{" "}
                  <code className="rounded bg-background px-1 py-0.5 text-xs text-foreground">
                    {"clarifications: [{ question, answer }]"}
                  </code>{" "}
                  to preserve the questions that improved the proposal.
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  Prompt preparation is capped at two rounds. The second call
                  may pass{" "}
                  <code className="rounded bg-background px-1 py-0.5 text-xs text-foreground">
                    {"clarifications: [{ question, answer }]"}
                  </code>{" "}
                  from the first round; after that, the tool returns a ready
                  prompt using the best available context.
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" />
                  MCP guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
                <Guardrail icon={<ListChecks aria-hidden="true" />}>
                  Approval tools are not exposed through MCP.
                </Guardrail>
                <Guardrail icon={<ShieldCheck aria-hidden="true" />}>
                  Write tools create pending proposals first.
                </Guardrail>
                <Guardrail icon={<Database aria-hidden="true" />}>
                  MCP proposal creation does not call AI_TASK_MODEL.
                </Guardrail>
                <Guardrail icon={<ListChecks aria-hidden="true" />}>
                  Prompt preparation returns questions only; it does not create
                  Todo cards or proposals.
                </Guardrail>
              </CardContent>
            </Card>
          </section>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Available tools</CardTitle>
              <CardDescription>
                These are the MCP tool names external clients should call.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {mcpTools.map((tool) => (
                <div
                  key={tool.name}
                  className="rounded-xl border border-border bg-background/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-sm font-medium text-foreground">
                      {tool.name}
                    </code>
                    <Badge variant="outline">{tool.mode}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function McpTokenManager({
  tokens,
  tokenName,
  createdToken,
  copiedToken,
  isLoading,
  isCreating,
  revokingTokenIds,
  onTokenNameChange,
  onCreateToken,
  onCopyToken,
  onRevokeToken,
}: {
  tokens: McpTokenView[];
  tokenName: string;
  createdToken: string | null;
  copiedToken: boolean;
  isLoading: boolean;
  isCreating: boolean;
  revokingTokenIds: Set<string>;
  onTokenNameChange: (value: string) => void;
  onCreateToken: () => void;
  onCopyToken: () => void;
  onRevokeToken: (tokenId: string) => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <KeyRound aria-hidden="true" />
          </span>
          User MCP tokens
        </CardTitle>
        <CardDescription>
          Tokens belong to your signed-in account. MCP writes use the token
          owner&apos;s board and proposal library.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">{tokens.length} tokens</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={tokenName}
            onChange={(event) => onTokenNameChange(event.target.value)}
            placeholder="Token name"
          />
          <Button
            type="button"
            onClick={onCreateToken}
            disabled={isCreating || !tokenName.trim()}
          >
            {isCreating ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Plus data-icon="inline-start" aria-hidden="true" />
            )}
            Create token
          </Button>
        </div>

        {createdToken ? (
          <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <div className="grid gap-1">
              <p className="text-sm font-medium text-foreground">
                Copy this token now
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Careeright stores only a hash. The full token will not be shown
                again after this page state changes.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <code className="overflow-x-auto rounded-lg border border-border bg-background px-3 py-2 text-xs leading-5 text-foreground">
                {createdToken}
              </code>
              <Button type="button" variant="secondary" onClick={onCopyToken}>
                {copiedToken ? (
                  <Check data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <Copy data-icon="inline-start" aria-hidden="true" />
                )}
                {copiedToken ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            Create a token before connecting ChatGPT, Codex, Claude, Gemini, or
            a local stdio MCP client.
          </div>
        ) : (
          <div className="grid gap-2">
            {tokens.map((token) => {
              const isRevoking = revokingTokenIds.has(token.id);

              return (
                <div
                  key={token.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {token.name}
                      </p>
                      {token.revokedAt ? (
                        <Badge variant="outline">revoked</Badge>
                      ) : (
                        <Badge variant="outline">active</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {token.tokenPrefix} · created{" "}
                      {formatTokenDate(token.createdAt)}
                      {token.lastUsedAt
                        ? ` · last used ${formatTokenDate(token.lastUsedAt)}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRevokeToken(token.id)}
                    disabled={Boolean(token.revokedAt) || isRevoking}
                  >
                    {isRevoking ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 data-icon="inline-start" aria-hidden="true" />
                    )}
                    Revoke
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FieldGroup({
  title,
  fields,
}: {
  title: string;
  fields: readonly string[];
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div
            key={field}
            className="rounded-lg border border-border bg-muted/30 px-3 py-2"
          >
            <code className="text-xs text-foreground">{field}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTokenDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function Guardrail({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-background/60 p-3">
      <span className="mt-0.5 text-primary [&>svg]:size-4">{icon}</span>
      <span>{children}</span>
    </div>
  );
}



