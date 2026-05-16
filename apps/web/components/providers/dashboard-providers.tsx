"use client";

import { rpcClient } from "@careeright/api/client";
import {
  CareerightUiProvider,
  type CareerightDashboardRoute,
} from "@repo/ui/providers/careeright-ui-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { UserAccountMenu } from "@/components/auth/user-account-menu";
import { CareerightLogo } from "@/components/brand/careeright-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TooltipProvider } from "@repo/ui/components/ui/tooltip";

export function DashboardProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 60_000,
          },
        },
      }),
  );
  const currentRoute = routeFromPathname(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <CareerightUiProvider
        value={{
          rpcClient,
          currentRoute,
          navigate: (route) => router.push(hrefFromRoute(route)),
          LinkComponent: Link,
          LogoComponent: CareerightLogo,
          ThemeToggleComponent: ThemeToggle,
          UserAccountMenuComponent: UserAccountMenu,
          openExternal: (url) => {
            window.open(url, "_blank", "noopener,noreferrer");
          },
          uploadResume: uploadResumePdf,
          copyText: (text) => navigator.clipboard.writeText(text),
        }}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </CareerightUiProvider>
    </QueryClientProvider>
  );
}

function routeFromPathname(pathname: string): CareerightDashboardRoute {
  if (pathname.startsWith("/dashboard/kanban")) return "board";
  if (pathname.startsWith("/dashboard/jobs")) return "jobs";
  if (pathname.startsWith("/dashboard/diary")) return "diary";
  if (pathname.startsWith("/dashboard/dsa")) return "dsa";
  if (pathname.startsWith("/dashboard/history")) return "history";
  if (pathname.startsWith("/dashboard/proposal")) return "proposals";
  if (pathname.startsWith("/dashboard/mcp-tools")) return "mcp-tools";
  if (pathname.startsWith("/dashboard/profile")) return "profile";
  return "analytics";
}

function hrefFromRoute(route: CareerightDashboardRoute) {
  if (route === "analytics") return "/dashboard";
  if (route === "board") return "/dashboard/kanban";
  if (route === "proposals") return "/dashboard/proposal";
  if (route === "mcp-tools") return "/dashboard/mcp-tools";
  return `/dashboard/${route}`;
}

async function uploadResumePdf(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/profile/resume", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Resume PDF import failed.",
    );
  }

  return payload;
}


