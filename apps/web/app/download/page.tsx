import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
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
const latestReleaseApiUrl =
  "https://api.github.com/repos/Prathamesh-chougale-17/career-code/releases/latest";

export const revalidate = 300;

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

type GitHubReleaseAsset = {
  browser_download_url?: string;
  name?: string;
  size?: number;
};

type GitHubRelease = {
  assets?: GitHubReleaseAsset[];
  html_url?: string;
  name?: string;
  published_at?: string;
  tag_name?: string;
};

type DownloadAsset = {
  label: string;
  name: string;
  size: string;
  url: string;
};

type DownloadRow = {
  icon: ReactNode;
  name: string;
  recommended: string;
  assets: DownloadAsset[];
};

export const metadata: Metadata = {
  title: "Download Careeright Desktop",
  description:
    "Download Careeright Desktop for Windows, macOS, and Linux from the latest official GitHub release.",
};

export default async function DownloadPage() {
  const release = await getLatestRelease();
  const rows = getDownloadRows(release);
  const displayReleaseUrl = release?.html_url ?? releaseUrl;
  const versionLabel = release?.tag_name ?? "Latest release";

  return (
    <main className="min-h-svh bg-[#070806] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(163,230,53,0.8),rgba(56,189,248,0.7),transparent)]" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 py-5 sm:px-6 lg:px-8">
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
                href={displayReleaseUrl}
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
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-lime-200/70">
                Latest release
              </p>
              <h2 className="mt-2 font-heading text-3xl font-semibold text-white">
                Direct downloads
              </h2>
            </div>
            <a
              href={displayReleaseUrl}
              className="inline-flex items-center gap-2 text-sm font-semibold text-lime-200 transition hover:text-lime-100"
            >
              {versionLabel}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11140f]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-zinc-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">OS</th>
                    <th className="px-5 py-4 font-semibold">Recommended</th>
                    <th className="px-5 py-4 font-semibold">Download links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rows.map((row) => (
                    <DownloadTableRow key={row.name} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!release ? (
            <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              Could not load release assets from GitHub right now. The generic
              latest release link is still available above.
            </p>
          ) : null}
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-4 md:grid-cols-3">
          <InfoCard title="Official builds">
            Releases are built from tagged GitHub Actions runs for each
            operating system.
          </InfoCard>
          <InfoCard title="Same backend">
            Desktop signs in with Google and uses the same Careeright production
            backend.
          </InfoCard>
          <InfoCard title="Versioned updates">
            Install the latest release once; future desktop updates can install
            directly from inside the app.
          </InfoCard>
        </div>
      </section>
    </main>
  );
}

function DownloadTableRow({ row }: { row: DownloadRow }) {
  return (
    <tr>
      <td className="px-5 py-5 align-top">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300 [&>svg]:size-5">
            {row.icon}
          </span>
          <span className="font-semibold text-white">{row.name}</span>
        </div>
      </td>
      <td className="px-5 py-5 align-top text-zinc-300">{row.recommended}</td>
      <td className="px-5 py-5 align-top">
        {row.assets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {row.assets.map((asset) => (
              <a
                key={asset.name}
                href={asset.url}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 font-semibold text-white transition hover:border-lime-300/50 hover:bg-lime-300/10 hover:text-lime-100"
              >
                <Download className="size-4" aria-hidden="true" />
                {asset.label}
                <span className="font-normal text-zinc-400">{asset.size}</span>
              </a>
            ))}
          </div>
        ) : (
          <a
            href={releaseUrl}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 font-semibold text-white transition hover:border-lime-300/50 hover:bg-lime-300/10 hover:text-lime-100"
          >
            Open latest release
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        )}
      </td>
    </tr>
  );
}

async function getLatestRelease() {
  try {
    const response = await fetch(latestReleaseApiUrl, {
      headers: {
        accept: "application/vnd.github+json",
      },
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GitHubRelease;
  } catch {
    return null;
  }
}

function getDownloadRows(release: GitHubRelease | null): DownloadRow[] {
  const assets = release?.assets ?? [];

  return [
    {
      icon: <Monitor />,
      name: "Windows",
      recommended: "Use the .msi installer. The .exe setup is also available.",
      assets: getAssets(assets, [
        { label: "MSI", test: (name) => name.endsWith(".msi") },
        { label: "EXE", test: (name) => name.endsWith(".exe") },
      ]),
    },
    {
      icon: <Laptop />,
      name: "macOS",
      recommended: "Use the .dmg installer for the latest macOS desktop build.",
      assets: getAssets(assets, [
        { label: "DMG", test: (name) => name.endsWith(".dmg") },
      ]),
    },
    {
      icon: <Terminal />,
      name: "Ubuntu / Linux",
      recommended:
        "Ubuntu users should use the .deb package. AppImage works broadly.",
      assets: getAssets(assets, [
        { label: "DEB", test: (name) => name.endsWith(".deb") },
        { label: "AppImage", test: (name) => name.endsWith(".AppImage") },
      ]),
    },
  ];
}

function getAssets(
  assets: GitHubReleaseAsset[],
  matchers: Array<{ label: string; test: (name: string) => boolean }>,
) {
  return matchers.flatMap((matcher) => {
    const asset = assets.find((candidate) => {
      const name = candidate.name ?? "";

      return !name.endsWith(".sig") && matcher.test(name);
    });

    if (!asset?.browser_download_url || !asset.name) {
      return [];
    }

    return [
      {
        label: matcher.label,
        name: asset.name,
        size: formatBytes(asset.size ?? 0),
        url: asset.browser_download_url,
      },
    ];
  });
}

function formatBytes(bytes: number) {
  if (!bytes) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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
