"use client";

import type { ReactNode } from "react";

import { DashboardSidebar } from "./dashboard-sidebar";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="desktop-scroll-hidden h-svh min-w-0 overflow-x-hidden overflow-y-auto">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

