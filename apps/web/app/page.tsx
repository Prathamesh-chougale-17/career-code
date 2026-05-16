import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { CareerightLogo } from "@/components/brand/careeright-logo";

export const metadata: Metadata = {
  title: "Careeright | MCP workspace for tasks and jobs",
  description:
    "Careeright turns AI-generated plans into reviewable Kanban proposals and tracks MCP-seeded job opportunities by date and status.",
};

const workflowSteps = [
  {
    title: "Receive from MCP",
    description:
      "Let AI clients send rough work plans or seed job opportunities directly into your signed-in workspace.",
  },
  {
    title: "Review before action",
    description:
      "Inspect generated tasks, references, assumptions, and job details before deciding what deserves attention.",
  },
  {
    title: "Move with intent",
    description:
      "Promote selected work into Todo, open apply links, and keep every job moving through a visible status pipeline.",
  },
] as const;

const trustPoints = [
  "Google OAuth keeps every board, proposal, job, and MCP token scoped to one user.",
  "Task tools create pending proposals before changing your board.",
  "Job tools can seed opportunities directly with dedupe, seeded dates, and status tracking.",
] as const;

export default function Home() {
  return (
    <main className="min-h-svh overflow-hidden bg-[#070806] text-white">
      <section className="relative border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(132,204,22,0.18),rgba(7,8,6,0))]" />
        <div className="mx-auto grid min-h-[92svh] w-full max-w-7xl gap-10 px-5 pb-14 pt-5 sm:px-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] lg:px-8">
          <header className="relative z-10 flex items-center justify-between gap-4 lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label="Careeright home"
            >
              <CareerightLogo priority />
              <span className="grid">
                <span className="font-heading text-lg font-semibold leading-none">
                  Careeright
                </span>
                <span className="mt-1 text-xs text-lime-100/70">
                  AI-safe Kanban
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/dashboard/jobs"
                className="hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10 sm:inline-flex"
              >
                Jobs
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-[#182206] transition hover:bg-lime-300"
              >
                Open dashboard
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </nav>
          </header>

          <div className="relative z-10 flex flex-col justify-center pb-4 pt-10 lg:pb-16">
            <p className="mb-5 w-fit rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-sm font-medium text-lime-100">
              MCP-native planning and job tracking
            </p>
            <h1 className="max-w-3xl font-heading text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
              Careeright
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              A focused workspace where AI clients prepare reviewable task
              proposals, seed job opportunities, and keep your board and job
              pipeline tied to your account.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/jobs"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-400 px-5 py-3 text-sm font-semibold text-[#182206] transition hover:bg-lime-300"
              >
                Track jobs
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
              >
                Open dashboard
              </Link>
            </div>
            <div className="mt-10 grid gap-3 text-sm leading-6 text-zinc-300 sm:grid-cols-3">
              <ProofPoint icon={<Sparkles />}>Structured proposals</ProofPoint>
              <ProofPoint icon={<Briefcase />}>Seeded job tracker</ProofPoint>
              <ProofPoint icon={<ShieldCheck />}>User-scoped data</ProofPoint>
            </div>
          </div>

          <div className="relative z-10 flex items-center pb-8 lg:pb-16">
            <WorkspacePreview />
          </div>
        </div>
      </section>

      <section className="bg-[#10110f] px-5 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.82fr_1fr]">
          <div>
            <p className="text-sm font-medium text-lime-300">Workflow</p>
            <h2 className="mt-3 max-w-xl font-heading text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Let agents bring things in. You decide what moves forward.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"
              >
                <p className="flex size-8 items-center justify-center rounded-full bg-lime-300 text-sm font-semibold text-[#172106]">
                  {index + 1}
                </p>
                <h3 className="mt-5 text-base font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#070806] px-5 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureTile icon={<Workflow />} title="Proposal library">
              Group HLD, LLD, algorithms, product features, and real project
              plans by topic before promoting them into execution.
            </FeatureTile>
            <FeatureTile icon={<Briefcase />} title="Jobs tracker">
              External MCP apps seed roles into dated sections with status,
              source, salary, and apply actions in one table.
            </FeatureTile>
            <FeatureTile icon={<LockKeyhole />} title="User workspace">
              Boards, proposals, jobs, and tokens belong to the signed-in Google
              user.
            </FeatureTile>
            <FeatureTile icon={<KeyRound />} title="Personal MCP tokens">
              Connect external clients with scoped tokens and keep each write
              tied to the account that created it.
            </FeatureTile>
            <FeatureTile icon={<CheckCircle2 />} title="Review safety">
              AI-generated work becomes visible and reviewable before it changes
              the board.
            </FeatureTile>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#141612] p-6">
            <p className="text-sm font-medium text-lime-300">Trust model</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-normal text-white">
              MCP clients write into Careeright with clear boundaries.
            </h2>
            <ul className="mt-6 grid gap-4 text-sm leading-6 text-zinc-300">
              {trustPoints.map((point) => (
                <li key={point} className="flex gap-3">
                  <CheckCircle2
                    className="mt-1 size-4 shrink-0 text-lime-300"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard/mcp-tools"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#11130f] transition hover:bg-lime-100"
            >
              View MCP tools
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProofPoint({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="text-lime-300 [&>svg]:size-4">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function FeatureTile({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-lime-300">
        {icon}
      </span>
      <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{children}</p>
    </article>
  );
}

function WorkspacePreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#151713] p-4 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-sm font-semibold text-white">Careeright workspace</p>
          <p className="mt-1 text-xs text-zinc-400">
            Proposals and jobs waiting for review
          </p>
        </div>
        <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-200">
          MCP connected
        </span>
      </div>

      <div className="grid gap-4 pt-4 lg:grid-cols-[0.76fr_1fr]">
        <div className="space-y-3">
          {[
            ["AI agent platform", "4 plans"],
            ["MCP-seeded jobs", "10 roles"],
            ["System design", "3 plans"],
          ].map(([topic, count], index) => (
              <div
                key={topic}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{topic}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-zinc-300">
                    {count}
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-lime-300"
                    style={{ width: `${68 - index * 14}%` }}
                  />
                </div>
              </div>
            ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1d2019] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Backend Engineer - Node.js
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Seeded from an external MCP app with source, apply link, salary
                context, and a user-controlled status.
              </p>
            </div>
            <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-xs text-sky-200">
              not applied
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["Apply", "linkedin.com/jobs"],
              ["Company", "Weekday AI"],
              ["Seeded", "Today"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="size-2 rounded-full bg-sky-300" />
                  <span className="truncate text-sm text-zinc-200">
                    {label}
                  </span>
                </div>
                <span className="rounded-full bg-lime-300 px-2.5 py-1 text-xs font-medium text-[#172106]">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-zinc-300">
            <PreviewStat value="10" label="jobs" />
            <PreviewStat value="6" label="statuses" />
            <PreviewStat value="1" label="seed date" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2">
      <p className="font-heading text-lg font-semibold text-white">{value}</p>
      <p className="text-zinc-500">{label}</p>
    </div>
  );
}


