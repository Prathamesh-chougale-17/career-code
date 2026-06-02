"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import type {
  BoardColumn,
  KanbanTask,
} from "@careeright/domain/kanban/schema";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

export type DraftTask = {
  title: string;
  description: string;
  priority: KanbanTask["priority"];
  columnId: KanbanTask["columnId"];
};

export function CreateTaskDialog({
  open,
  columns,
  draft,
  onDraftChange,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  columns: BoardColumn[];
  draft: DraftTask;
  onDraftChange: Dispatch<SetStateAction<DraftTask>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add custom task</DialogTitle>
            <DialogDescription>
              Manual tasks go directly to the board and skip AI proposal review.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={draft.title}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Task title"
              />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={draft.description}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Optional note"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Column</FieldLabel>
                <Select
                  value={draft.columnId}
                  onValueChange={(value) =>
                    onDraftChange((current) => ({
                      ...current,
                      columnId: value as KanbanTask["columnId"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {columns.map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Priority</FieldLabel>
                <PrioritySelect
                  value={draft.priority}
                  onChange={(priority) =>
                    onDraftChange((current) => ({ ...current, priority }))
                  }
                />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !draft.title.trim()}
            >
              {isPending ? (
                <Loader2
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Plus data-icon="inline-start" aria-hidden="true" />
              )}
              Add card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditTaskDialog({
  task,
  columns,
  onClose,
  onSave,
  isSaving,
}: {
  task: KanbanTask;
  columns: BoardColumn[];
  onClose: () => void;
  onSave: (task: KanbanTask) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState(task);
  const [criteriaText, setCriteriaText] = useState(
    task.acceptanceCriteria.join("\n"),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update the card details and save them directly to the board.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={4}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Column</FieldLabel>
              <Select
                value={draft.columnId}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    columnId: value as KanbanTask["columnId"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <PrioritySelect
                value={draft.priority}
                onChange={(priority) =>
                  setDraft((current) => ({ ...current, priority }))
                }
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Acceptance criteria</FieldLabel>
            <Textarea
              value={criteriaText}
              onChange={(event) => setCriteriaText(event.target.value)}
              rows={5}
            />
            <FieldDescription>
              One acceptance criterion per line.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSaving || !draft.title.trim()}
            onClick={() =>
              onSave({
                ...draft,
                acceptanceCriteria: criteriaText
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          >
            {isSaving ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Check data-icon="inline-start" aria-hidden="true" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrioritySelect({
  value,
  onChange,
}: {
  value: KanbanTask["priority"];
  onChange: (priority: KanbanTask["priority"]) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) =>
        onChange(nextValue as KanbanTask["priority"])
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Priority" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
