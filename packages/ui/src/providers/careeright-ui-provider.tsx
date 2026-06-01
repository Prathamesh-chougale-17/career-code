"use client";

import {
  createContext,
  useContext,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from "react";
import type { rpcClient as careerightRpcClient } from "@careeright/api/client";

export type CareerightDashboardRoute =
  | "analytics"
  | "board"
  | "jobs"
  | "diary"
  | "dsa"
  | "system-design"
  | "friends"
  | "leaderboard"
  | "projects"
  | "history"
  | "proposals"
  | "mcp-tools"
  | "profile";

export type CareerightLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export type CareerightUiAdapter = {
  rpcClient: typeof careerightRpcClient;
  currentRoute: CareerightDashboardRoute;
  navigate: (route: CareerightDashboardRoute) => void;
  LinkComponent: ComponentType<CareerightLinkProps>;
  LogoComponent: ComponentType<{
    alt?: string;
    className?: string;
    imageClassName?: string;
    priority?: boolean;
    sizes?: string;
  }>;
  ThemeToggleComponent: ComponentType;
  UserAccountMenuComponent: ComponentType<{ className?: string }>;
  openExternal: (url: string) => void | Promise<void>;
  uploadResume: (file: File) => Promise<unknown>;
  copyText?: (text: string) => void | Promise<void>;
};

const CareerightUiContext = createContext<CareerightUiAdapter | null>(null);

export function CareerightUiProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CareerightUiAdapter;
}) {
  return (
    <CareerightUiContext.Provider value={value}>
      {children}
    </CareerightUiContext.Provider>
  );
}

export function useCareerightUi() {
  const context = useContext(CareerightUiContext);

  if (!context) {
    throw new Error("useCareerightUi must be used within CareerightUiProvider.");
  }

  return context;
}

export function UiLink(props: CareerightLinkProps) {
  const { LinkComponent } = useCareerightUi();

  return <LinkComponent {...props} />;
}
