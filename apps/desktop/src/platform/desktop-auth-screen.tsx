import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

import { getCareerightOrigin } from "../lib/config";
import { CareerightLogo } from "./careeright-logo";

export function DesktopAuthScreen({
  authError,
  isSigningIn,
  onSignIn,
}: {
  authError: string;
  isSigningIn: boolean;
  onSignIn: () => void;
}) {
  return (
    <main className="auth-page">
      <section className="auth-copy">
        <div className="brand-row">
          <CareerightLogo className="size-12" sizes="48px" />
          <div>
            <p className="eyebrow">Careeright Desktop</p>
            <p className="brand-subtitle">Private career execution workspace</p>
          </div>
        </div>
        <h1>Your Careeright workspace, tuned for desktop.</h1>
        <p className="lede">
          Connect with Google to load your jobs, board, proposals, diary, DSA
          progress, profile, and MCP tools through the production backend.
        </p>
        <div className="auth-pills">
          <span>
            <Sparkles aria-hidden="true" /> Review-first AI
          </span>
          <span>
            <Briefcase aria-hidden="true" /> Job pipeline
          </span>
          <span>
            <ShieldCheck aria-hidden="true" /> Bearer session
          </span>
        </div>
        <section className="desktop-preview" aria-label="Workspace preview">
          <div className="preview-header">
            <div>
              <p>Live workspace</p>
              <span>Dashboard parity with the web app</span>
            </div>
            <strong>4/5 ready</strong>
          </div>
          <div className="preview-grid">
            <PreviewMetric label="Jobs" value="123" tone="amber" />
            <PreviewMetric label="Profile" value="100%" tone="lime" />
            <PreviewMetric label="Proposals" value="3" tone="violet" />
          </div>
          <div className="preview-row">
            <span>Backend Engineer - Node.js</span>
            <strong>not applied</strong>
          </div>
        </section>
      </section>
      <section className="auth-card" aria-label="Sign in">
        <div className="auth-card-header">
          <p className="card-kicker">Production backend</p>
          <CheckCircle2 aria-hidden="true" />
        </div>
        <h2>Continue to Careeright</h2>
        <p className="muted">
          We will open Google in your system browser and return here after the
          desktop session is created.
        </p>
        <p className="mono-text">{getCareerightOrigin()}</p>
        <Button size="lg" disabled={isSigningIn} onClick={onSignIn}>
          {isSigningIn ? <Loader2 className="spin" /> : null}
          {isSigningIn ? "Waiting for browser..." : "Continue with Google"}
          {!isSigningIn ? (
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          ) : null}
        </Button>
        {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
      </section>
    </main>
  );
}

function PreviewMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "amber" | "lime" | "violet";
}) {
  return (
    <div className={`preview-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
