import { ArrowLeft, CheckCircle2, Mail, ShieldCheck, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CareerightLogo } from "@/components/brand/careeright-logo";

const supportEmail = "prathamesh17170@gmail.com";
const deletionMailto =
  "mailto:prathamesh17170@gmail.com?subject=Careeright%20data%20deletion%20request";

export const metadata: Metadata = {
  title: "Careeright Data Deletion Request",
  description:
    "Request deletion of your Careeright account data, profile data, job tracker data, board tasks, diary entries, DSA and System Design progress, proposals, and uploaded resume data.",
};

export default function DataDeletionPage() {
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
                  Data deletion
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
              Account and app data deletion
            </p>
            <h1 className="font-heading text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl">
              Request deletion of your Careeright data
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Careeright users can request deletion of their account-associated
              data without reinstalling the app. Send a request from the Google
              account email you use with Careeright, and we will process it as
              soon as reasonably possible. You can also review the{" "}
              <Link
                href="/privacy"
                className="font-semibold text-lime-300 underline-offset-4 hover:underline"
              >
                Careeright Privacy Policy
              </Link>
              .
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={deletionMailto}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-400 px-5 py-3 text-sm font-semibold text-[#182206] transition hover:bg-lime-300"
              >
                <Mail className="size-4" aria-hidden="true" />
                Email deletion request
              </a>
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
              >
                {supportEmail}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-5xl gap-5 md:grid-cols-3">
          <InfoCard icon={<Trash2 />} title="What we delete">
            Careeright account data linked to your Google sign-in, including
            board tasks, job tracker records, diary entries, DSA and System
            Design progress, proposals, profile items, resume import data, and
            MCP tokens.
          </InfoCard>
          <InfoCard icon={<Mail />} title="What to include">
            Include your Careeright Google account email and write whether you
            want all account data deleted or only specific data such as jobs,
            diary entries, board tasks, profile data, or resume uploads.
          </InfoCard>
          <InfoCard icon={<ShieldCheck />} title="What may be retained">
            Some limited records may be kept when required for security, fraud
            prevention, service integrity, legal compliance, or backup recovery,
            and only for as long as necessary.
          </InfoCard>
        </div>
      </section>

      <section className="bg-[#10110f] px-5 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-white/[0.045] p-6 sm:p-8">
          <h2 className="font-heading text-2xl font-semibold tracking-normal text-white">
            Request process
          </h2>
          <ol className="mt-6 grid gap-4 text-sm leading-6 text-zinc-300">
            {[
              "Send your request to the support email above from the Google account used with Careeright.",
              "Tell us whether you want all account data deleted or only selected data categories.",
              "We may reply to verify account ownership before deleting data.",
              "After deletion is complete, you may need to sign in again if you choose to use Careeright later.",
            ].map((step) => (
              <li key={step} className="flex gap-3">
                <CheckCircle2
                  className="mt-1 size-4 shrink-0 text-lime-300"
                  aria-hidden="true"
                />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
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


