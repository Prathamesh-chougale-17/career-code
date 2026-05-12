"use client";

import {
  BarChart3,
  BookOpen,
  Briefcase,
  Code2,
  ClipboardList,
  History as HistoryIcon,
  Server,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { UserAccountMenu } from "@/components/auth/user-account-menu";
import { CareerCodeLogo } from "@/components/brand/career-code-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardMetricsQueryKey } from "@career-code/api/query-keys";
import { rpcClient } from "@career-code/api/client";

export type DashboardSidebarSection =
  | "analytics"
  | "board"
  | "diary"
  | "dsa"
  | "history"
  | "jobs"
  | "proposals"
  | "profile"
  | "mcp-tools";

function currentSection(pathname: string): DashboardSidebarSection {
  if (pathname === "/dashboard") {
    return "analytics";
  }

  if (pathname.startsWith("/dashboard/kanban")) {
    return "board";
  }

  if (pathname.startsWith("/dashboard/jobs")) {
    return "jobs";
  }

  if (pathname.startsWith("/dashboard/diary")) {
    return "diary";
  }

  if (pathname.startsWith("/dashboard/dsa")) {
    return "dsa";
  }

  if (pathname.startsWith("/dashboard/history")) {
    return "history";
  }

  if (pathname.startsWith("/dashboard/proposal")) {
    return "proposals";
  }

  if (pathname.startsWith("/dashboard/mcp-tools")) {
    return "mcp-tools";
  }

  if (pathname.startsWith("/dashboard/profile")) {
    return "profile";
  }

  return "analytics";
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const activeSection = currentSection(pathname);
  const metricsQuery = useQuery({
    queryKey: dashboardMetricsQueryKey,
    queryFn: () => rpcClient.dashboard.metrics(),
  });
  const metrics = metricsQuery.data;
  const metricsLoading = metricsQuery.isPending && !metrics;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="group-data-[collapsible=icon]:items-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Career Code"
              className="group-data-[collapsible=icon]:justify-center"
              render={<Link href="/" />}
            >
              <CareerCodeLogo className="size-8 rounded-lg" sizes="32px" />
              <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">Career Code</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  AI-safe Kanban
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "analytics"}
                  tooltip="Analytics"
                  render={<Link href="/dashboard" />}
                >
                  <BarChart3 />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "board"}
                  tooltip="Board"
                  render={<Link href="/dashboard/kanban" />}
                >
                  <ClipboardList />
                  <span>Board</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "jobs"}
                  tooltip="Jobs"
                  render={<Link href="/dashboard/jobs" />}
                >
                  <Briefcase />
                  <span>Jobs</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "diary"}
                  tooltip="Diary"
                  render={<Link href="/dashboard/diary" />}
                >
                  <BookOpen />
                  <span>Diary</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "dsa"}
                  tooltip="DSA"
                  render={<Link href="/dashboard/dsa" />}
                >
                  <Code2 />
                  <span>DSA</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "history"}
                  tooltip="History"
                  render={<Link href="/dashboard/history" />}
                >
                  <HistoryIcon />
                  <span>History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "proposals"}
                  tooltip="Proposals"
                  render={<Link href="/dashboard/proposal" />}
                >
                  <Sparkles />
                  <span>Proposals</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>
                  {metricsLoading ? "..." : (metrics?.proposalCount ?? 0)}
                </SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "mcp-tools"}
                  tooltip="MCP tools"
                  render={<Link href="/dashboard/mcp-tools" />}
                >
                  <Server />
                  <span>MCP tools</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "profile"}
                  tooltip="Profile"
                  render={<Link href="/dashboard/profile" />}
                >
                  <UserRound />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent className="grid gap-3">
            {metricsLoading ? (
              <>
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
              </>
            ) : (
              <>
                <Metric label="Total tasks" value={metrics?.taskCount ?? 0} />
                <Metric
                  label="In progress"
                  value={metrics?.inProgressCount ?? 0}
                />
                <Metric label="Completed" value={metrics?.doneCount ?? 0} />
              </>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="group-data-[collapsible=icon]:hidden">
          <UserAccountMenu className="mb-3" />
        </div>
        <SidebarSeparator />
        <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
            Appearance
          </span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-medium">{value}</p>
    </div>
  );
}
