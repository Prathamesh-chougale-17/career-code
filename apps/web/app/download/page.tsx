import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Laptop,
  Monitor,
  Terminal,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { CareerightLogo } from "@/components/brand/careeright-logo";

const releaseUrl =
  "https://github.com/Prathamesh-chougale-17/career-code/releases/latest";

const platforms = [
  {
    icon: <Monitor />,
    name: "Windows",
    format: ".exe or .msi installer",
    note: "Recommended for most desktop users on Windows 10 and Windows 11.",
  },
  {
    icon: <Laptop />,
    name: "macOS",
    format: ".dmg installer",
    note: "Use the latest macOS release asset for Apple Silicon or Intel Macs.",
  },
  {
    icon: <Terminal />,
    name: "Linux",
    format: ".AppImage or .deb package",
    note: "AppImage works broadly; Debian/Ubuntu users can use the .deb.",
  },
] as const;

export const metadata: Metadata = {
  title: "Download Careeright Desktop",
  description:
    "Download Careeright Desktop for Windows, macOS, and Linux from the latest official GitHub release.",
};

export default function DownloadPage() {
  return (
    <main className="min-h-svh bg-[#070806] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(163,230,53,0.8),rgba(56,189,248,0.7),transparent)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col px-5 py-6 sm:px-6 lg:px-8">
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
                  Desktop downloads
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

          <div className="grid gap-10 py-16 lg:grid-cols-[0.9fr_1fr] lg:items-center">
            <div>
              <p className="mb-5 w-fit rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-sm font-medium text-lime-100">
                Windows, macOS, and Linux
              </p>
              <h1 className="font-heading text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl">
                Download Careeright Desktop
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
                Install Careeright as a native desktop app and connect it to the
                same production workspace used by web and mobile.
              </p>
              <a
                href={releaseUrl}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-lime-400 px-5 py-3 text-sm font-semibold text-[#182206] transition hover:bg-lime-300"
              >
                <Download className="size-4" aria-hidden="true" />
                Open latest release
              </a>
            </div>

            <div className="grid gap-3">
              {platforms.map((platform) => (
                <PlatformCard key={platform.name} {...platform} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-3">
          <InfoCard title="Official builds">
            Releases are built from tagged GitHub Actions runs for each
            operating system.
          </InfoCard>
          <InfoCard title="Same backend">
            Desktop signs in with Google and uses the same Careeright production
            backend.
          </InfoCard>
          <InfoCard title="Versioned updates">
            Use the latest release first; auto-updates can be added after the
            first public release.
          </InfoCard>
        </div>
      </section>
    </main>
  );
}

function PlatformCard({
  icon,
  name,
  format,
  note,
}: {
  icon: ReactNode;
  name: string;
  format: string;
  note: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300 [&>svg]:size-5">
            {icon}
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">{name}</h2>
            <p className="mt-1 text-sm text-zinc-400">{format}</p>
          </div>
        </div>
        <ArrowRight className="mt-1 size-4 text-zinc-500" aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-400">{note}</p>
    </article>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#11140f] p-5">
      <CheckCircle2 className="size-5 text-lime-300" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{children}</p>
    </article>
  );
}
