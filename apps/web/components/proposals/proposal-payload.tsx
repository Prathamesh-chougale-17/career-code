"use client";

import { Check, Loader2, Plus } from "lucide-react";

import { TaskReferenceLinks } from "@/components/task-reference-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AiProposal,
  KanbanTask,
  ProposedTask,
} from "@careeright/domain/kanban/schema";
import { taskFingerprint } from "@careeright/domain/kanban/task-fingerprint";
import { cn } from "@/lib/utils";

const priorityStyles: Record<KanbanTask["priority"], string> = {
  low: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  high: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  urgent: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export function ProposalPayload({
  proposal,
  existingTaskFingerprints,
  addingTaskFingerprint,
  onAddTask,
  className,
}: {
  proposal: AiProposal;
  existingTaskFingerprints: Set<string>;
  addingTaskFingerprint?: string;
  onAddTask: (proposal: AiProposal, task: ProposedTask, fingerprint: string) => void;
  className?: string;
}) {
  if (proposal.type === "task_breakdown" && "tasks" in proposal.payload) {
    const payload = proposal.payload;

    return (
      <div
        className={cn(
          "mt-4 flex min-w-0 flex-col gap-4",
          className,
        )}
      >
        <ClarificationsUsed
          refinedPrompt={payload.refinedPrompt}
          clarifications={payload.clarifications}
        />

        <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {payload.tasks.map((task, index) => {
            const fingerprint = taskFingerprint(task);
            const isAdded = existingTaskFingerprints.has(fingerprint);
            const isAdding = addingTaskFingerprint === fingerprint;

            return (
              <div
                key={`${fingerprint}-${index}`}
                className="flex min-w-0 flex-col rounded-xl border border-border/70 bg-muted/30 p-4"
              >
                <div className="grid gap-2">
                  <h3 className="break-words text-sm font-semibold leading-6 text-foreground">
                    {task.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.suggestedColumn.replaceAll("_", " ")}</span>
                    <Badge
                      variant="outline"
                      className={cn("capitalize", priorityStyles[task.priority])}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 flex flex-1 flex-col text-xs leading-5">
                  {task.description ? (
                    <p className="whitespace-pre-wrap break-words text-muted-foreground">
                      {task.description}
                    </p>
                  ) : null}

                  {task.acceptanceCriteria.length > 0 ? (
                    <ul className="mt-3 flex flex-col gap-1.5 rounded-xl bg-background/55 p-3 text-muted-foreground">
                      {task.acceptanceCriteria.map((item) => (
                        <li key={item} className="flex gap-2">
                          <Check
                            className="mt-0.5 size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="break-words">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {task.dependencies.length > 0 ? (
                    <div className="mt-3 rounded-xl border border-border/70 bg-background/55 p-3 text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">
                        Depends on
                      </p>
                      <ul className="flex flex-col gap-1">
                        {task.dependencies.map((dependency) => (
                          <li key={dependency} className="break-words">
                            {dependency}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <TaskReferenceLinks task={task} className="mt-3" />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    size="sm"
                    variant={isAdded ? "secondary" : "default"}
                    disabled={isAdded || isAdding}
                    onClick={() => onAddTask(proposal, task, fingerprint)}
                  >
                    {isAdded ? (
                      <Check data-icon="inline-start" aria-hidden="true" />
                    ) : isAdding ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Plus data-icon="inline-start" aria-hidden="true" />
                    )}
                    {isAdded ? "Added" : "Add to Todo"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if ("taskId" in proposal.payload) {
    return (
      <Badge variant="outline" className="mt-3">
        {proposal.payload.taskNumber
          ? `Task #${proposal.payload.taskNumber}`
          : `Task ID: ${proposal.payload.taskId}`}
      </Badge>
    );
  }

  return null;
}

function ClarificationsUsed({
  refinedPrompt,
  clarifications,
}: {
  refinedPrompt?: string;
  clarifications: { question: string; answer: string }[];
}) {
  if (!refinedPrompt && clarifications.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-background/55 p-4 text-xs leading-5 text-muted-foreground">
      <p className="text-sm font-semibold text-foreground">
        Clarifications used
      </p>
      {clarifications.length > 0 ? (
        <dl className="grid gap-3">
          {clarifications.map((item) => (
            <div key={`${item.question}-${item.answer}`} className="grid gap-1">
              <dt className="break-words font-medium text-foreground">
                {item.question}
              </dt>
              <dd className="whitespace-pre-wrap break-words">{item.answer}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {refinedPrompt ? (
        <div className="grid gap-1">
          <p className="font-medium text-foreground">Refined prompt</p>
          <p className="whitespace-pre-wrap break-words">{refinedPrompt}</p>
        </div>
      ) : null}
    </div>
  );
}
