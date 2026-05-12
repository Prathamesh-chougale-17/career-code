"use client";

import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
