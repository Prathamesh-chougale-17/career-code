"use client";

import type { ReactNode } from "react";

import { DashboardSidebar } from "./dashboard-sidebar";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="desktop-scroll-hidden min-w-0 overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

