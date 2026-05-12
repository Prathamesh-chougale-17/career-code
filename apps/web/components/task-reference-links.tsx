import { ExternalLink } from "lucide-react";

import type { ReferenceLink } from "@career-code/domain/kanban/schema";
import { cn } from "@/lib/utils";

type LinkableTask = {
  resourceLinks: ReferenceLink[];
  helpfulLinks: ReferenceLink[];
  problemLinks: ReferenceLink[];
};

const linkGroups = [
  ["Resources", "resourceLinks"],
  ["Helpful links", "helpfulLinks"],
  ["Problems", "problemLinks"],
] as const;

export function TaskReferenceLinks({
  task,
  className,
}: {
  task: LinkableTask;
  className?: string;
}) {
  const groups = linkGroups
    .map(([label, key]) => ({
      label,
      links: task[key],
    }))
    .filter((group) => group.links.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-background/55 p-3 text-xs",
        className,
      )}
    >
      <div className="grid gap-3">
        {groups.map((group) => (
          <div key={group.label} className="grid gap-1.5">
            <p className="font-medium text-foreground">{group.label}</p>
            <ul className="grid gap-1.5 text-muted-foreground">
              {group.links.map((link) => (
                <li key={`${group.label}-${link.url}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-start gap-1.5 rounded-md text-primary underline-offset-4 hover:underline"
                  >
                    <ExternalLink
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">
                      {link.title ?? linkLabel(link.url)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function linkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
