"use client";

import type { ReactNode } from "react";

import { PwaServiceWorker } from "@/components/pwa-service-worker";
import { ThemeProvider } from "@/components/theme-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <PwaServiceWorker />
      {children}
    </ThemeProvider>
  );
}
