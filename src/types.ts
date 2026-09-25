/**
 * Domain model for todos.
 *
 * Conventions:
 * - Every entity has a string `id` and ISO-8601 `createdAt` / `updatedAt`.
 * - Dates without a time are local calendar days (`YYYY-MM-DD`) so a task due
 *   "Friday" stays on Friday when the device changes time zone.
 * - Ordering is explicit (`order`) so lists can be reordered by drag without
 *   depending on array position.
 * - `null` means "deliberately empty"; optional fields are for future additions
 *   that older persisted data won't have.
 */
import type { Priority, TagColor } from './theme';

export type { Priority, TagColor };

export type ID = string;
/** Full timestamp, e.g. `2026-09-25T14:03:00.000Z`. */
export type ISODateTime = string;
/** Local calendar day, e.g. `2026-09-25`. */
export type ISODate = string;
/** Local wall-clock time, 24h, e.g. `09:30`. */
export type TimeOfDay = string;

/** Ordered from least to most urgent; use for sorting. */
export const PRIORITIES: readonly Priority[] = ['none', 'low', 'medium', 'high'];
export const priorityRank = (p: Priority): number => PRIORITIES.indexOf(p);

interface Entity {
  id: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Category extends Entity {
  name: string;
  color: TagColor;
  /** SF Symbol / icon name; UI decides how to render it. */
  icon: string | null;
  order: number;
}

export interface Subtask {
  id: ID;
  title: string;
  completed: boolean;
  completedAt: ISODateTime | null;
}

export interface DueDate {
  date: ISODate;
  /** `null` for an all-day task. */
  time: TimeOfDay | null;
}

export interface Todo extends Entity {
  title: string;
  notes: string;
  /** `null` = Inbox (uncategorised). */
  categoryId: ID | null;
  priority: Priority;
  due: DueDate | null;
  completed: boolean;
  completedAt: ISODateTime | null;
  subtasks: Subtask[];
  order: number;
}

// ─── Inputs ─────────────────────────────────────────────────────────────────
// What callers pass in; the store fills ids, timestamps and ordering.

export type NewTodo = Pick<Todo, 'title'> &
  Partial<Pick<Todo, 'notes' | 'categoryId' | 'priority' | 'due'>> & {
    subtasks?: string[];
  };

export type TodoPatch = Partial<
  Pick<Todo, 'title' | 'notes' | 'categoryId' | 'priority' | 'due'>
>;

export type NewCategory = Pick<Category, 'name'> &
  Partial<Pick<Category, 'color' | 'icon'>>;

export type CategoryPatch = Partial<Pick<Category, 'name' | 'color' | 'icon'>>;

// ─── Views ──────────────────────────────────────────────────────────────────

/** Smart lists derived from todos rather than stored. */
export type SmartList = 'inbox' | 'today' | 'upcoming' | 'overdue' | 'all' | 'completed';

/** What a screen is showing: a smart list or a user category. */
export type ListFilter = { kind: 'smart'; list: SmartList } | { kind: 'category'; id: ID };

export type SortKey = 'manual' | 'due' | 'priority' | 'created';
