"use client";

import {
  BarChart3,
  BookOpen,
  Briefcase,
  Code2,
  ClipboardList,
  FolderKanban,
  History as HistoryIcon,
  Server,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  UiLink as Link,
  useCareerightUi,
  type CareerightDashboardRoute,
} from "../providers/careeright-ui-provider";
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
} from "./ui/sidebar";
import { Skeleton } from "./ui/skeleton";
import {
  dashboardMetricsQueryKey,
  friendsSummaryQueryKey,
} from "@careeright/api/query-keys";

export function DashboardSidebar() {
  const {
    currentRoute,
    LogoComponent,
    ThemeToggleComponent,
    UserAccountMenuComponent,
    rpcClient,
  } = useCareerightUi();
  const metricsQuery = useQuery({
    queryKey: dashboardMetricsQueryKey,
    queryFn: () => rpcClient.dashboard.metrics(),
  });
  const friendsQuery = useQuery({
    queryKey: friendsSummaryQueryKey,
    queryFn: () => rpcClient.friends.summary(),
  });
  const metrics = metricsQuery.data;
  const friendsSummary = friendsQuery.data;
  const metricsLoading = metricsQuery.isPending && !metrics;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="group-data-[collapsible=icon]:items-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Careeright"
              className="group-data-[collapsible=icon]:justify-center"
              render={<Link href="/dashboard" />}
            >
              <LogoComponent className="size-8 rounded-lg" sizes="32px" />
              <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">Careeright</span>
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
              <SidebarItem route="analytics" href="/dashboard" label="Analytics" icon={BarChart3} currentRoute={currentRoute} />
              <SidebarItem route="board" href="/dashboard/kanban" label="Board" icon={ClipboardList} currentRoute={currentRoute} />
              <SidebarItem route="jobs" href="/dashboard/jobs" label="Jobs" icon={Briefcase} currentRoute={currentRoute} />
              <SidebarItem route="diary" href="/dashboard/diary" label="Diary" icon={BookOpen} currentRoute={currentRoute} />
              <SidebarItem route="dsa" href="/dashboard/dsa" label="DSA" icon={Code2} currentRoute={currentRoute} />
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentRoute === "friends"}
                  tooltip="Friends"
                  render={<Link href="/dashboard/friends" />}
                >
                  <UsersRound />
                  <span>Friends</span>
                </SidebarMenuButton>
                {friendsSummary?.incomingRequests.length ? (
                  <SidebarMenuBadge>
                    {friendsSummary.incomingRequests.length}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
              <SidebarItem route="leaderboard" href="/dashboard/leaderboard" label="Leaderboard" icon={Trophy} currentRoute={currentRoute} />
              <SidebarItem route="projects" href="/dashboard/projects" label="Projects" icon={FolderKanban} currentRoute={currentRoute} />
              <SidebarItem route="history" href="/dashboard/history" label="History" icon={HistoryIcon} currentRoute={currentRoute} />
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentRoute === "proposals"}
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
              <SidebarItem route="mcp-tools" href="/dashboard/mcp-tools" label="MCP tools" icon={Server} currentRoute={currentRoute} />
              <SidebarItem route="profile" href="/dashboard/profile" label="Profile" icon={UserRound} currentRoute={currentRoute} />
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
          <UserAccountMenuComponent className="mb-3" />
        </div>
        <SidebarSeparator />
        <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
            Appearance
          </span>
          <ThemeToggleComponent />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarItem({
  currentRoute,
  href,
  icon: Icon,
  label,
  route,
}: {
  currentRoute: CareerightDashboardRoute;
  href: string;
  icon: typeof BarChart3;
  label: string;
  route: CareerightDashboardRoute;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={currentRoute === route}
        tooltip={label}
        render={<Link href={href} />}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
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

