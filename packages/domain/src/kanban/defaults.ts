import type { Board, BoardColumn } from "@careeright/domain/kanban/schema";
import { DEFAULT_BOARD_ID, SOLO_USER_ID } from "@careeright/domain/kanban/schema";

export const defaultColumnDefinitions = [
  {
    id: "backlog",
    title: "Backlog",
    color: "bg-slate-500",
  },
  {
    id: "todo",
    title: "Todo",
    color: "bg-sky-500",
  },
  {
    id: "in_progress",
    title: "In Progress",
    color: "bg-amber-500",
  },
  {
    id: "review",
    title: "Review",
    color: "bg-violet-500",
  },
  {
    id: "done",
    title: "Done",
    color: "bg-emerald-500",
  },
] as const;

export function createDefaultBoard(now = new Date().toISOString()): Board {
  return {
    id: DEFAULT_BOARD_ID,
    userId: SOLO_USER_ID,
    title: "AI Work Board",
    description: "A solo-first board for turning prompts into confirmed work.",
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultColumns(
  boardId = DEFAULT_BOARD_ID,
  userId = SOLO_USER_ID,
  now = new Date().toISOString(),
): BoardColumn[] {
  return defaultColumnDefinitions.map((column, index) => ({
    id: column.id,
    boardId,
    userId,
    title: column.title,
    order: index,
    color: column.color,
    createdAt: now,
    updatedAt: now,
  }));
}
