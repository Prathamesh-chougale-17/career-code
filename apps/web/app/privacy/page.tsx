import {
  ArrowLeft,
  Briefcase,
  Database,
  ExternalLink,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { CareerightLogo } from "@/components/brand/careeright-logo";

const supportEmail = "prathamesh17170@gmail.com";
const updatedAt = "May 14, 2026";

const collectedData = [
  "Google sign-in information such as name, email address, account identifier, and profile image when provided by Google.",
  "Career workspace data such as board tasks, job tracker records, status changes, diary entries, DSA progress, proposals, MCP token metadata, profile items, application defaults, and resume import data.",
  "Files you choose to upload, such as PDF resumes for profile import.",
  "Technical data needed to run and protect the service, such as session cookies, authentication tokens, IP address, device/browser information, app version, request logs, and error diagnostics.",
] as const;

const notCollectedData = [
  "Precise physical location",
  "Contacts, SMS, or call logs",
  "Health data",
  "Financial account data or payment card data",
  "Government ID numbers",
  "Advertising identifiers for ad targeting",
] as const;

const usageReasons = [
  "Create and secure your Careeright account.",
  "Sync your jobs, board tasks, diary entries, DSA progress, proposals, MCP tools, and profile data across web and mobile.",
  "Import and review resume/profile information you choose to upload.",
  "Operate, debug, protect, and improve Careeright.",
  "Respond to support, privacy, and deletion requests.",
] as const;

export const metadata: Metadata = {
  title: "Careeright Privacy Policy",
  description:
    "Privacy Policy for Careeright, including what data is collected, how it is used, how it is protected, and how users can request deletion.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-svh bg-[#070806] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(132,204,22,0.18),rgba(7,8,6,0))]" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col px-5 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
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
                  Privacy Policy
                </span>
              </span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Home
            </Link>
          </header>

          <div className="max-w-3xl py-16 sm:py-20">
            <p className="mb-5 w-fit rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-sm font-medium text-lime-100">
              Last updated: {updatedAt}
            </p>
            <h1 className="font-heading text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              This Privacy Policy explains how Careeright, provided by
              Profeonix, collects, uses, protects, and deletes information when
              you use the Careeright web and mobile app.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-400 px-5 py-3 text-sm font-semibold text-[#182206] transition hover:bg-lime-300"
              >
                <Mail className="size-4" aria-hidden="true" />
                Contact privacy support
              </a>
              <Link
                href="/data-deletion"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
              >
                Data deletion
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-5xl gap-5 md:grid-cols-3">
          <PolicyCard icon={<UserRound />} title="Account data">
            Careeright uses Google OAuth for account access. We collect the
            account information required to identify you and keep your workspace
            scoped to your signed-in account.
          </PolicyCard>
          <PolicyCard icon={<Briefcase />} title="Workspace data">
            We store the career data you create or import, including jobs,
            tasks, profile details, diary notes, DSA progress, proposals, and
            resume-related data.
          </PolicyCard>
          <PolicyCard icon={<LockKeyhole />} title="Security">
            Data is sent over encrypted HTTPS connections. Authentication
            cookies, tokens, and service logs are used to keep the app working
            and protect accounts.
          </PolicyCard>
        </div>
      </section>

      <section className="bg-[#10110f] px-5 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-5xl gap-5">
          <PolicySection icon={<Database />} title="Information we collect">
            <PolicyList items={collectedData} />
          </PolicySection>

          <PolicySection icon={<ShieldCheck />} title="Information we do not collect">
            <PolicyList items={notCollectedData} />
          </PolicySection>

          <PolicySection icon={<FileText />} title="How we use information">
            <PolicyList items={usageReasons} />
          </PolicySection>

          <PolicySection icon={<ExternalLink />} title="Sharing and service providers">
            <p>
              We do not sell or rent your personal data. We may use trusted
              service providers to operate Careeright, including authentication,
              hosting, database, storage, logging, and support infrastructure.
              These providers process data only as needed to provide and secure
              the app.
            </p>
            <p>
              Careeright may open third-party links, such as job application
              pages, LeetCode pages, YouTube videos, or other resources. Those
              websites and services are controlled by their own privacy
              policies.
            </p>
          </PolicySection>

          <PolicySection icon={<Trash2 />} title="Retention and deletion">
            <p>
              We keep account and workspace data while your Careeright account
              is active or as long as needed to provide the app. You can delete
              individual app data such as jobs, tasks, diary entries, profile
              items, and proposals from the app where those controls are
              available.
            </p>
            <p>
              You can request deletion of some or all Careeright account data on
              the{" "}
              <Link
                href="/data-deletion"
                className="font-semibold text-lime-300 underline-offset-4 hover:underline"
              >
                Data Deletion page
              </Link>
              . Some limited records may be retained only when required for
              security, fraud prevention, service integrity, legal compliance,
              or backup recovery, and only for as long as necessary.
            </p>
          </PolicySection>

          <PolicySection icon={<ShieldCheck />} title="Children and age">
            <p>
              Careeright is intended for users aged 18 and over. It is not
              directed to children. If you believe a minor has provided data to
              Careeright, contact us so we can review and delete it where
              appropriate.
            </p>
          </PolicySection>

          <PolicySection icon={<Mail />} title="Contact">
            <p>
              For privacy questions, access requests, correction requests, or
              deletion requests, contact us at{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="font-semibold text-lime-300 underline-offset-4 hover:underline"
              >
                {supportEmail}
              </a>
              .
            </p>
            <p>
              We may update this Privacy Policy as Careeright changes. The
              latest version will be posted on this page with the updated date.
            </p>
          </PolicySection>
        </div>
      </section>
    </main>
  );
}

function PolicyCard({
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
      <h2 className="mt-5 text-base font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{children}</p>
    </article>
  );
}

function PolicySection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-lime-300">
          {icon}
        </span>
        <h2 className="font-heading text-2xl font-semibold tracking-normal text-white">
          {title}
        </h2>
      </div>
      <div className="mt-5 grid gap-4 text-sm leading-6 text-zinc-300">
        {children}
      </div>
    </article>
  );
}

function PolicyList({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <ShieldCheck
            className="mt-1 size-4 shrink-0 text-lime-300"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
