"use client";

import { FileText, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import type { ProjectAttribute } from "@careeright/domain/projects/schema";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Skeleton } from "../ui/skeleton";

export function ProjectsMarkdownPreview({
  attributes,
  content,
  onOpenAttribute,
}: {
  attributes: ProjectAttribute[];
  content: string;
  onOpenAttribute: (attribute: ProjectAttribute) => void;
}) {
  const terms = useMemo(() => createReferenceTerms(attributes), [attributes]);

  function renderReferences(children: ReactNode) {
    return renderReferenceChildren(children, terms, onOpenAttribute);
  }

  return (
    <div className="min-h-[24rem] overflow-auto rounded-lg border border-border bg-background p-3 sm:min-h-[32rem] sm:p-5 xl:min-h-[42rem]">
      {content.trim() ? (
        <div className="grid min-w-0 gap-4 text-sm leading-7">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              h1: ({ children }) => (
                <h1 className="break-words font-heading text-2xl font-semibold sm:text-3xl">
                  {renderReferences(children)}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="break-words font-heading text-xl font-semibold sm:text-2xl">
                  {renderReferences(children)}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="break-words font-heading text-lg font-medium sm:text-xl">
                  {renderReferences(children)}
                </h3>
              ),
              p: ({ children }) => (
                <p className="break-words text-foreground/90">
                  {renderReferences(children)}
                </p>
              ),
              a: ({ children, href }) => (
                <a
                  className="text-primary underline underline-offset-4"
                  href={href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {children}
                </a>
              ),
              ul: ({ children }) => (
                <ul className="ml-5 list-disc text-foreground/90">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="ml-5 list-decimal text-foreground/90">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="pl-1">{renderReferences(children)}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary pl-4 text-muted-foreground">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border-b border-border bg-muted/50 px-3 py-2 font-medium">
                  {renderReferences(children)}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b border-border px-3 py-2 align-top">
                  {renderReferences(children)}
                </td>
              ),
              pre: ({ children }) => {
                const child = Array.isArray(children) ? children[0] : children;

                if (
                  child &&
                  typeof child === "object" &&
                  "props" in child &&
                  typeof child.props === "object" &&
                  child.props &&
                  "className" in child.props &&
                  typeof child.props.className === "string" &&
                  child.props.className.includes("language-mermaid")
                ) {
                  return <MermaidBlock chart={String(child.props.children ?? "")} />;
                }

                return (
                  <pre className="max-w-full overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-6 sm:p-4">
                    {children}
                  </pre>
                );
              },
              code: ({ children, className }) => (
                <code
                  className={cn(
                    "rounded bg-muted px-1.5 py-0.5 font-mono text-xs",
                    className,
                  )}
                >
                  {children}
                </code>
              ),
            }}
          >
            {content}
          </Markdown>
        </div>
      ) : (
        <Empty className="min-h-[20rem] border border-dashed bg-muted/20 sm:min-h-[28rem]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Preview will appear here</EmptyTitle>
            <EmptyDescription>
              Write markdown on the left. Use fenced `mermaid` blocks for diagrams.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

type ReferenceTerm = {
  attribute: ProjectAttribute;
  term: string;
};

function createReferenceTerms(attributes: ProjectAttribute[]) {
  const byTerm = new Map<string, ReferenceTerm>();

  for (const attribute of attributes) {
    for (const term of [attribute.label, ...attribute.aliases]) {
      const normalized = term.trim().toLowerCase();

      if (!normalized || byTerm.has(normalized)) {
        continue;
      }

      byTerm.set(normalized, { attribute, term: term.trim() });
    }
  }

  return Array.from(byTerm.values()).sort(
    (left, right) => right.term.length - left.term.length,
  );
}

function renderReferenceChildren(
  children: ReactNode,
  terms: ReferenceTerm[],
  onOpenAttribute: (attribute: ProjectAttribute) => void,
): ReactNode {
  if (typeof children === "string") {
    return renderReferenceText(children, terms, onOpenAttribute);
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <span key={index}>
        {renderReferenceChildren(child, terms, onOpenAttribute)}
      </span>
    ));
  }

  return children;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderReferenceText(
  text: string,
  terms: ReferenceTerm[],
  onOpenAttribute: (attribute: ProjectAttribute) => void,
) {
  if (terms.length === 0) {
    return text;
  }

  const termLookup = new Map(
    terms.map((term) => [term.term.toLowerCase(), term.attribute]),
  );
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9_])(${terms.map((term) => escapeRegex(term.term)).join("|")})(?=$|[^A-Za-z0-9_])`,
    "gi",
  );
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const prefix = match[1] ?? "";
    const term = match[2] ?? "";
    const termStart = match.index + prefix.length;
    const attribute = termLookup.get(term.toLowerCase());

    if (!attribute) {
      continue;
    }

    if (termStart > lastIndex) {
      nodes.push(text.slice(lastIndex, termStart));
    }

    nodes.push(
      <button
        key={`${termStart}-${term}`}
        type="button"
        className="rounded-sm bg-primary/10 px-1 font-medium text-primary underline-offset-4 hover:underline"
        onClick={() => onOpenAttribute(attribute)}
      >
        {term}
      </button>,
    );
    lastIndex = termStart + term.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

type MermaidColorMode = "light" | "dark";

function detectMermaidColorMode(): MermaidColorMode {
  if (typeof document === "undefined") {
    return "light";
  }

  const root = document.documentElement;

  if (
    root.classList.contains("dark") ||
    root.dataset.theme === "dark" ||
    root.style.colorScheme === "dark"
  ) {
    return "dark";
  }

  return "light";
}

function useMermaidColorMode() {
  const [colorMode, setColorMode] = useState<MermaidColorMode>("light");

  useEffect(() => {
    const root = document.documentElement;
    const updateColorMode = () => setColorMode(detectMermaidColorMode());
    const observer = new MutationObserver(updateColorMode);
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

    updateColorMode();
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    mediaQuery?.addEventListener("change", updateColorMode);

    return () => {
      observer.disconnect();
      mediaQuery?.removeEventListener("change", updateColorMode);
    };
  }, []);

  return colorMode;
}

function mermaidThemeVariables(colorMode: MermaidColorMode) {
  if (colorMode === "dark") {
    return {
      darkMode: true,
      background: "#111827",
      mainBkg: "#111827",
      primaryColor: "#1f2937",
      primaryTextColor: "#f8fafc",
      primaryBorderColor: "#94a3b8",
      secondaryColor: "#172033",
      secondaryTextColor: "#f8fafc",
      secondaryBorderColor: "#64748b",
      tertiaryColor: "#0f172a",
      tertiaryTextColor: "#f8fafc",
      tertiaryBorderColor: "#475569",
      textColor: "#f8fafc",
      titleColor: "#f8fafc",
      lineColor: "#cbd5e1",
      edgeLabelBackground: "#111827",
      clusterBkg: "#0f172a",
      clusterBorder: "#64748b",
      noteBkgColor: "#1f2937",
      noteTextColor: "#f8fafc",
      noteBorderColor: "#94a3b8",
      actorBkg: "#1f2937",
      actorTextColor: "#f8fafc",
      actorLineColor: "#94a3b8",
      signalColor: "#cbd5e1",
      signalTextColor: "#f8fafc",
      labelBoxBkgColor: "#111827",
      labelBoxBorderColor: "#64748b",
      labelTextColor: "#f8fafc",
      loopTextColor: "#f8fafc",
      activationBkgColor: "#334155",
      activationBorderColor: "#cbd5e1",
    };
  }

  return {
    darkMode: false,
    background: "#ffffff",
    mainBkg: "#ffffff",
    primaryColor: "#f8fafc",
    primaryTextColor: "#0f172a",
    primaryBorderColor: "#64748b",
    secondaryColor: "#eef2ff",
    secondaryTextColor: "#0f172a",
    secondaryBorderColor: "#94a3b8",
    tertiaryColor: "#f1f5f9",
    tertiaryTextColor: "#0f172a",
    tertiaryBorderColor: "#cbd5e1",
    textColor: "#0f172a",
    titleColor: "#0f172a",
    lineColor: "#334155",
    edgeLabelBackground: "#ffffff",
    clusterBkg: "#f8fafc",
    clusterBorder: "#94a3b8",
    noteBkgColor: "#fef9c3",
    noteTextColor: "#0f172a",
    noteBorderColor: "#ca8a04",
    actorBkg: "#f8fafc",
    actorTextColor: "#0f172a",
    actorLineColor: "#64748b",
    signalColor: "#334155",
    signalTextColor: "#0f172a",
    labelBoxBkgColor: "#ffffff",
    labelBoxBorderColor: "#cbd5e1",
    labelTextColor: "#0f172a",
    loopTextColor: "#0f172a",
    activationBkgColor: "#e2e8f0",
    activationBorderColor: "#64748b",
  };
}

function MermaidBlock({ chart }: { chart: string }) {
  const reactId = useId();
  const colorMode = useMermaidColorMode();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const zoomPercent = Math.round(zoom * 100);

  useEffect(() => {
    let cancelled = false;
    const id = `careeright-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}-${colorMode}`;

    setError("");

    import("mermaid")
      .then(({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: mermaidThemeVariables(colorMode),
        });

        return mermaid.render(id, chart);
      })
      .then((result) => {
        if (!cancelled) {
          setSvg(result.svg);
          setError("");
        }
      })
      .catch((renderError: unknown) => {
        if (!cancelled) {
          setSvg("");
          setError(renderError instanceof Error ? renderError.message : "Something went wrong.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart, colorMode, reactId]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Mermaid diagram could not render: {error}
      </div>
    );
  }

  if (!svg) {
    return <Skeleton className="h-48 rounded-lg" />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="flex flex-col items-start gap-2 border-b border-border bg-background/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-sm font-medium">Diagram</p>
        <div className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-start">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            aria-label="Zoom diagram out"
            disabled={zoom <= 0.5}
            onClick={() =>
              setZoom((current) => Math.max(0.5, Number((current - 0.1).toFixed(2))))
            }
          >
            <ZoomOut aria-hidden="true" />
          </Button>
          <span className="min-w-10 text-center text-xs font-medium text-muted-foreground sm:min-w-12">
            {zoomPercent}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            aria-label="Zoom diagram in"
            disabled={zoom >= 2.5}
            onClick={() =>
              setZoom((current) => Math.min(2.5, Number((current + 0.1).toFixed(2))))
            }
          >
            <ZoomIn aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Reset diagram zoom"
            disabled={zoom === 1}
            onClick={() => setZoom(1)}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="overflow-auto p-2 sm:p-4">
        <div
          className="mx-auto transition-[width] duration-200 [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-none"
          style={{ width: `${zoom * 100}%` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
