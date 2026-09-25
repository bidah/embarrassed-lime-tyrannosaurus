/**
 * Todo store.
 *
 * State is normalised (`Record<ID, Entity>`) so edits touch one key and
 * untouched todos keep their object identity — components selecting a single
 * todo don't re-render when a sibling changes.
 *
 * Read derived data through the hooks at the bottom (`useTodoList`,
 * `useListCounts`, …) rather than building arrays inline in a selector, which
 * would return a new array every render.
 */
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import {
  priorityRank,
  type Category,
  type CategoryPatch,
  type ID,
  type ISODate,
  type ListFilter,
  type NewCategory,
  type NewTodo,
  type SmartList,
  type SortKey,
  type Subtask,
  type Todo,
  type TodoPatch,
} from '../types';
import { zustandStorage } from './storage';

// ─── Helpers ────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

/** Today as a local `YYYY-MM-DD`. */
export const todayISO = (d = new Date()): ISODate => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const nextOrder = (items: { order: number }[]) =>
  items.reduce((max, i) => Math.max(max, i.order), -1) + 1;

const makeSubtask = (title: string): Subtask => ({
  id: randomUUID(),
  title: title.trim(),
  completed: false,
  completedAt: null,
});

// ─── State ──────────────────────────────────────────────────────────────────

interface TodoState {
  todos: Record<ID, Todo>;
  categories: Record<ID, Category>;
}

interface TodoActions {
  // Todos
  addTodo: (input: NewTodo) => ID;
  updateTodo: (id: ID, patch: TodoPatch) => void;
  toggleTodo: (id: ID) => void;
  deleteTodo: (id: ID) => Todo | undefined;
  /** Put a previously deleted todo back (for "Undo"). */
  restoreTodo: (todo: Todo) => void;
  /** Rewrite `order` to match the given id sequence (e.g. after a drag). */
  reorderTodos: (orderedIds: ID[]) => void;
  clearCompleted: (categoryId?: ID | null) => void;

  // Subtasks
  addSubtask: (todoId: ID, title: string) => ID | undefined;
  renameSubtask: (todoId: ID, subtaskId: ID, title: string) => void;
  toggleSubtask: (todoId: ID, subtaskId: ID) => void;
  deleteSubtask: (todoId: ID, subtaskId: ID) => void;
  reorderSubtasks: (todoId: ID, orderedIds: ID[]) => void;

  // Categories
  addCategory: (input: NewCategory) => ID;
  updateCategory: (id: ID, patch: CategoryPatch) => void;
  /** Deletes the category; its todos move to the Inbox. */
  deleteCategory: (id: ID) => void;
  reorderCategories: (orderedIds: ID[]) => void;

  reset: () => void;
}

export type TodoStore = TodoState & TodoActions;

const seedCategories = (): Record<ID, Category> => {
  const t = now();
  const seeds: Pick<Category, 'name' | 'color' | 'icon'>[] = [
    { name: 'Personal', color: 'iris', icon: 'person' },
    { name: 'Work', color: 'sky', icon: 'briefcase' },
    { name: 'Errands', color: 'mint', icon: 'cart' },
  ];
  return Object.fromEntries(
    seeds.map((s, order) => {
      const id = randomUUID();
      return [id, { ...s, id, order, createdAt: t, updatedAt: t }];
    }),
  );
};

const initialState = (): TodoState => ({ todos: {}, categories: seedCategories() });

/** Apply `fn` to one todo, bumping `updatedAt`. No-op if the id is unknown. */
const patchTodo = (state: TodoState, id: ID, fn: (t: Todo) => Partial<Todo>) => {
  const todo = state.todos[id];
  if (!todo) return state;
  return { todos: { ...state.todos, [id]: { ...todo, ...fn(todo), updatedAt: now() } } };
};

const reorder = <T extends { id: ID; order: number }>(
  items: Record<ID, T>,
  orderedIds: ID[],
): Record<ID, T> => {
  const next = { ...items };
  orderedIds.forEach((id, order) => {
    const item = next[id];
    if (item && item.order !== order) next[id] = { ...item, order };
  });
  return next;
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useTodoStore = create<TodoStore>()(
  persist(
    (set, get) => ({
      ...initialState(),

      // Todos
      addTodo: ({ title, notes = '', categoryId = null, priority = 'none', due = null, subtasks = [] }) => {
        const id = randomUUID();
        const t = now();
        set((s) => ({
          todos: {
            ...s.todos,
            [id]: {
              id,
              title: title.trim(),
              notes,
              categoryId,
              priority,
              due,
              completed: false,
              completedAt: null,
              subtasks: subtasks.filter((st) => st.trim()).map(makeSubtask),
              order: nextOrder(Object.values(s.todos)),
              createdAt: t,
              updatedAt: t,
            },
          },
        }));
        return id;
      },

      updateTodo: (id, patch) =>
        set((s) => patchTodo(s, id, () => (patch.title !== undefined ? { ...patch, title: patch.title.trim() } : patch))),

      toggleTodo: (id) =>
        set((s) =>
          patchTodo(s, id, (t) => ({
            completed: !t.completed,
            completedAt: t.completed ? null : now(),
          })),
        ),

      deleteTodo: (id) => {
        const todo = get().todos[id];
        if (todo) {
          set((s) => {
            const { [id]: _, ...rest } = s.todos;
            return { todos: rest };
          });
        }
        return todo;
      },

      restoreTodo: (todo) => set((s) => ({ todos: { ...s.todos, [todo.id]: todo } })),

      reorderTodos: (orderedIds) => set((s) => ({ todos: reorder(s.todos, orderedIds) })),

      clearCompleted: (categoryId) =>
        set((s) => ({
          todos: Object.fromEntries(
            Object.entries(s.todos).filter(
              ([, t]) => !(t.completed && (categoryId === undefined || t.categoryId === categoryId)),
            ),
          ),
        })),

      // Subtasks
      addSubtask: (todoId, title) => {
        if (!get().todos[todoId] || !title.trim()) return undefined;
        const subtask = makeSubtask(title);
        set((s) => patchTodo(s, todoId, (t) => ({ subtasks: [...t.subtasks, subtask] })));
        return subtask.id;
      },

      renameSubtask: (todoId, subtaskId, title) =>
        set((s) =>
          patchTodo(s, todoId, (t) => ({
            subtasks: t.subtasks.map((st) => (st.id === subtaskId ? { ...st, title: title.trim() } : st)),
          })),
        ),

      toggleSubtask: (todoId, subtaskId) =>
        set((s) =>
          patchTodo(s, todoId, (t) => ({
            subtasks: t.subtasks.map((st) =>
              st.id === subtaskId
                ? { ...st, completed: !st.completed, completedAt: st.completed ? null : now() }
                : st,
            ),
          })),
        ),

      deleteSubtask: (todoId, subtaskId) =>
        set((s) =>
          patchTodo(s, todoId, (t) => ({ subtasks: t.subtasks.filter((st) => st.id !== subtaskId) })),
        ),

      reorderSubtasks: (todoId, orderedIds) =>
        set((s) =>
          patchTodo(s, todoId, (t) => {
            const byId = new Map(t.subtasks.map((st) => [st.id, st]));
            const ordered = orderedIds.flatMap((id) => byId.get(id) ?? []);
            const rest = t.subtasks.filter((st) => !orderedIds.includes(st.id));
            return { subtasks: [...ordered, ...rest] };
          }),
        ),

      // Categories
      addCategory: ({ name, color = 'iris', icon = null }) => {
        const id = randomUUID();
        const t = now();
        set((s) => ({
          categories: {
            ...s.categories,
            [id]: {
              id,
              name: name.trim(),
              color,
              icon,
              order: nextOrder(Object.values(s.categories)),
              createdAt: t,
              updatedAt: t,
            },
          },
        }));
        return id;
      },

      updateCategory: (id, patch) =>
        set((s) => {
          const cat = s.categories[id];
          if (!cat) return s;
          const next = { ...cat, ...patch, updatedAt: now() };
          if (patch.name !== undefined) next.name = patch.name.trim();
          return { categories: { ...s.categories, [id]: next } };
        }),

      deleteCategory: (id) =>
        set((s) => {
          const { [id]: _, ...categories } = s.categories;
          const t = now();
          const todos = Object.fromEntries(
            Object.entries(s.todos).map(([tid, todo]) => [
              tid,
              todo.categoryId === id ? { ...todo, categoryId: null, updatedAt: t } : todo,
            ]),
          );
          return { categories, todos };
        }),

      reorderCategories: (orderedIds) =>
        set((s) => ({ categories: reorder(s.categories, orderedIds) })),

      reset: () => set(initialState()),
    }),
    {
      name: 'todo-store',
      storage: zustandStorage,
      version: 1,
      partialize: ({ todos, categories }) => ({ todos, categories }),
      // Bump `version` and add a case here whenever the persisted shape changes.
      migrate: (persisted, _version) => persisted as TodoState,
    },
  ),
);

// ─── Derived data ───────────────────────────────────────────────────────────

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

/** Due timestamp for sorting; all-day tasks sort to the end of their day. */
const dueKey = (t: Todo) =>
  t.due ? `${t.due.date}T${t.due.time ?? '99:99'}` : '￿';

const comparators: Record<SortKey, (a: Todo, b: Todo) => number> = {
  manual: byOrder,
  due: (a, b) => dueKey(a).localeCompare(dueKey(b)) || byOrder(a, b),
  priority: (a, b) => priorityRank(b.priority) - priorityRank(a.priority) || dueKey(a).localeCompare(dueKey(b)),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

const smartListPredicate = (list: SmartList, today: ISODate): ((t: Todo) => boolean) => {
  switch (list) {
    case 'inbox':
      return (t) => !t.completed && t.categoryId === null;
    case 'today':
      return (t) => !t.completed && !!t.due && t.due.date <= today;
    case 'upcoming':
      return (t) => !t.completed && !!t.due && t.due.date > today;
    case 'overdue':
      return (t) => !t.completed && !!t.due && t.due.date < today;
    case 'all':
      return (t) => !t.completed;
    case 'completed':
      return (t) => t.completed;
  }
};

export const matchesFilter = (filter: ListFilter, today = todayISO()) =>
  filter.kind === 'smart'
    ? smartListPredicate(filter.list, today)
    : (t: Todo) => t.categoryId === filter.id;

/** Filter + sort a list of todos. Pure — usable outside React. */
export const selectTodoList = (
  state: TodoState,
  filter: ListFilter,
  sort: SortKey = 'manual',
  today = todayISO(),
): Todo[] => {
  const list = Object.values(state.todos).filter(matchesFilter(filter, today));
  // Completed items always sink below open ones, most recently completed first.
  return list.sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      (a.completed && b.completed
        ? (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
        : comparators[sort](a, b)),
  );
};

export const subtaskProgress = (todo: Todo) => {
  const done = todo.subtasks.filter((s) => s.completed).length;
  const total = todo.subtasks.length;
  return { done, total, ratio: total ? done / total : 0 };
};

export const isOverdue = (todo: Todo, today = todayISO()) =>
  !todo.completed && !!todo.due && todo.due.date < today;

// ─── Hooks ──────────────────────────────────────────────────────────────────

export const useTodo = (id: ID) => useTodoStore((s) => s.todos[id]);

export const useCategory = (id: ID | null) =>
  useTodoStore((s) => (id ? s.categories[id] : undefined));

export const useCategories = () =>
  useTodoStore(useShallow((s) => Object.values(s.categories).sort(byOrder)));

export const useTodoList = (filter: ListFilter, sort: SortKey = 'manual') =>
  useTodoStore(useShallow((s) => selectTodoList(s, filter, sort)));

/** Open-item counts for each smart list and category, for sidebar badges. */
export const useListCounts = () =>
  useTodoStore(
    useShallow((s) => {
      const today = todayISO();
      const open = Object.values(s.todos).filter((t) => !t.completed);
      const counts: Record<string, number> = {
        inbox: 0,
        today: 0,
        upcoming: 0,
        overdue: 0,
        all: open.length,
        completed: Object.keys(s.todos).length - open.length,
      };
      for (const t of open) {
        if (t.categoryId === null) counts.inbox++;
        else counts[t.categoryId] = (counts[t.categoryId] ?? 0) + 1;
        if (t.due) {
          if (t.due.date <= today) counts.today++;
          if (t.due.date < today) counts.overdue++;
          if (t.due.date > today) counts.upcoming++;
        }
      }
      return counts;
    }),
  );

/** Actions only — stable references, never trigger a re-render. */
export const todoActions = () => {
  const { todos: _t, categories: _c, ...actions } = useTodoStore.getState();
  return actions;
};
