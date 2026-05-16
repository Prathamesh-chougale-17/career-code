import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Code2,
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
    title: "Capture",
    description:
      "Let MCP clients seed job opportunities, task plans, DSA work, and project ideas into one signed-in workspace.",
  },
  {
    title: "Review",
    description:
      "Inspect generated proposals, source links, assumptions, and job details before anything changes your board.",
  },
  {
    title: "Execute",
    description:
      "Promote selected tasks, update job statuses, track diary progress, and keep the whole system accountable.",
  },
] as const;

const trustPoints = [
  "Google OAuth keeps every board, proposal, job, profile, diary entry, and MCP token scoped to one user.",
  "AI-created work enters as a pending proposal before it touches your board.",
  "Job tools seed opportunities with dedupe, source metadata, seeded dates, and status tracking.",
] as const;

const featureTiles = [
  {
    icon: <Workflow />,
    title: "Proposal library",
    description:
      "Group HLD, LLD, algorithms, product features, and project plans by topic before promoting them into execution.",
  },
  {
    icon: <Briefcase />,
    title: "Jobs tracker",
    description:
      "Track external roles with status, source, apply links, salary context, fit score, and seeded dates.",
  },
  {
    icon: <Code2 />,
    title: "DSA progress",
    description:
      "Keep topic progress and completion states close to your job search instead of scattering them across tools.",
  },
  {
    icon: <KeyRound />,
    title: "MCP tokens",
    description:
      "Connect external clients with account-scoped tokens and revoke access whenever your workflow changes.",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-svh bg-[#070806] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(163,230,53,0.8),rgba(56,189,248,0.7),transparent)]" />
        <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-5 py-5 sm:px-6 lg:px-8">
          <SiteHeader />

          <div className="grid flex-1 gap-10 py-12 lg:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] lg:items-center lg:py-16">
            <div className="max-w-3xl">
              <p className="mb-5 w-fit rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-sm font-medium text-lime-100">
                MCP-native planning, jobs, and career execution
              </p>
              <h1 className="font-heading text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
                Turn agent output into work you can trust.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
                Careeright is a private workspace for AI-generated proposals,
                job opportunities, board tasks, diary notes, DSA progress, and
                MCP tools. Agents can bring work in, but you stay in control of
                what moves forward.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryLink href="/dashboard">
                  Open dashboard
                  <ArrowRight className="size-4" aria-hidden="true" />
                </PrimaryLink>
                <SecondaryLink href="/dashboard/jobs">
                  View job tracker
                </SecondaryLink>
              </div>

              <div className="mt-10 grid gap-3 text-sm leading-6 text-zinc-300 sm:grid-cols-3">
                <ProofPoint icon={<Sparkles />}>Review-first AI</ProofPoint>
                <ProofPoint icon={<Briefcase />}>123 tracked jobs</ProofPoint>
                <ProofPoint icon={<ShieldCheck />}>User-scoped MCP</ProofPoint>
              </div>
            </div>

            <WorkspacePreview />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0d100c] px-5 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-medium text-lime-300">Workflow</p>
            <h2 className="mt-3 max-w-xl font-heading text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Built for the moment after an AI agent says, “here is the plan.”
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
              Careeright does not ask you to blindly accept generated work. It
              gives every task, job, and proposal a place to land before you
              decide what deserves your time.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-sm shadow-black/20"
              >
                <p className="flex size-9 items-center justify-center rounded-full bg-lime-300 text-sm font-semibold text-[#172106]">
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
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1fr_0.86fr] lg:items-center">
          <div className="grid gap-4 sm:grid-cols-2">
            {featureTiles.map((feature) => (
              <FeatureTile
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
              >
                {feature.description}
              </FeatureTile>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#141812] p-6 shadow-2xl shadow-black/30">
            <p className="text-sm font-medium text-sky-200">Trust model</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-normal text-white">
              Connected tools, clear boundaries.
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
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href="/dashboard/mcp-tools">
                View MCP tools
                <ArrowRight className="size-4" aria-hidden="true" />
              </PrimaryLink>
              <SecondaryLink href="/privacy">Read privacy policy</SecondaryLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-3" aria-label="Careeright home">
        <CareerightLogo priority />
        <span className="grid">
          <span className="font-heading text-lg font-semibold leading-none">
            Careeright
          </span>
          <span className="mt-1 text-xs text-lime-100/70">
            AI-safe career workspace
          </span>
        </span>
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/privacy"
          className="hidden rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10 sm:inline-flex"
        >
          Privacy
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-[#182206] transition hover:bg-lime-300"
        >
          Dashboard
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-400 px-5 py-3 text-sm font-semibold text-[#182206] transition hover:bg-lime-300"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
    >
      {children}
    </Link>
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
    <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-sm shadow-black/20">
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
    <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#151a14] p-4 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-sm font-semibold text-white">Workspace overview</p>
          <p className="mt-1 text-xs text-zinc-400">
            Jobs, proposals, profile, DSA, and MCP in one place
          </p>
        </div>
        <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-200">
          4/5 ready
        </span>
      </div>

      <div className="grid gap-4 pt-4 lg:grid-cols-[0.72fr_1fr]">
        <div className="grid gap-3">
          <PreviewMetric icon={<Briefcase />} label="Jobs" value="123" tone="lime" />
          <PreviewMetric icon={<ClipboardList />} label="Tasks" value="7" tone="sky" />
          <PreviewMetric icon={<Sparkles />} label="Proposals" value="3" tone="violet" />
          <PreviewMetric icon={<LockKeyhole />} label="Tokens" value="2" tone="zinc" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1e241c] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Backend Engineer - Node.js
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Seeded by MCP with source, fit, salary context, and an apply
                link ready for review.
              </p>
            </div>
            <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-xs text-sky-200">
              not applied
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["Fit score", "95%"],
              ["Source", "LinkedIn"],
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

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Board health</p>
              <span className="text-xs text-zinc-400">profile 100%</span>
            </div>
            <div className="mt-4 grid grid-cols-5 items-end gap-2">
              {[38, 78, 8, 22, 14].map((height, index) => (
                <div key={height} className="grid gap-2">
                  <div
                    className="rounded-t-lg bg-lime-300"
                    style={{
                      height: `${height}px`,
                      backgroundColor:
                        index === 1
                          ? "#fbbf24"
                          : index === 3
                            ? "#38bdf8"
                            : "#84cc16",
                    }}
                  />
                  <div className="h-1 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "lime" | "sky" | "violet" | "zinc";
}) {
  const toneClass = {
    lime: "text-lime-300 bg-lime-300/10 border-lime-300/20",
    sky: "text-sky-200 bg-sky-300/10 border-sky-300/20",
    violet: "text-violet-200 bg-violet-300/10 border-violet-300/20",
    zinc: "text-zinc-200 bg-white/5 border-white/10",
  }[tone];

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-3">
        <span className={`flex size-10 items-center justify-center rounded-xl border ${toneClass}`}>
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-zinc-500">live workspace data</p>
        </div>
      </div>
      <p className="font-heading text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
