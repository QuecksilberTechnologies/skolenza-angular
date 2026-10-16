import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { tap } from 'rxjs';

import { Common, TasksApi } from '@core/services';
import { Task, TaskFilter, TaskScope, TaskStats, TaskStatus } from '@shared/interfaces';

import { isDueToday, isOverdue, KANBAN_COLUMNS, TODAY } from './tasks-nav';

interface TasksState {
  allTasks: Task[];
  selectedTask: Task | null;
  filters: TaskFilter | null;
  searchTerm: string;
  scope: TaskScope;
  currentStaffMemberId: string;
  pageNumber: number;
  pageSize: number;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  loaded: boolean;
}

const initialState: TasksState = {
  allTasks: [],
  selectedTask: null,
  filters: null,
  searchTerm: '',
  scope: 'all',
  // Mock "current user"; real app resolves from login info.
  currentStaffMemberId: 'emp-1',
  pageNumber: 0,
  pageSize: 10,
  sortBy: null,
  sortOrder: 'desc',
  loaded: false,
};

/** Column type: kanban lane keyed by status. */
export interface KanbanColumn {
  status: TaskStatus;
  tasks: Task[];
}

function matchesFilters(task: Task, filters: TaskFilter | null, term: string): boolean {
  if (filters?.status && task.status !== filters.status) return false;
  if (filters?.priority && task.priority !== filters.priority) return false;
  if (filters?.category && task.category !== filters.category) return false;
  if (filters?.assigneeId && task.assigneeId !== filters.assigneeId) return false;
  if (term) {
    const q = term.toLowerCase();
    const haystack = `${task.title} ${task.description} ${task.assigneeName} ${task.tags.join(' ')}`;
    if (!haystack.toLowerCase().includes(q)) return false;
  }
  return true;
}

function sortTasks(list: Task[], sortBy: string | null, order: 'asc' | 'desc'): Task[] {
  if (!sortBy) return list;
  const dir = order === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const av = a[sortBy as keyof Task];
    const bv = b[sortBy as keyof Task];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

export const TasksStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const tasksApi = inject(TasksApi);
    const commonService = inject(Common);

    const tasksResource = rxResource({
      // Constant params: fetch once on init; refetch only via reload().
      params: () => true,
      stream: () =>
        tasksApi.getTasks().pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              allTasks: res.isSucceeded ? res.data : [],
              loaded: true,
            });
          }),
        ),
    });

    return { tasksResource };
  }),
  withComputed((store) => {
    const scopedTasks = computed(() => {
      const scope = store.scope();
      const me = store.currentStaffMemberId();
      const all = store.allTasks();
      if (scope === 'my') return all.filter((t) => t.assigneeId === me);
      // 'team' and 'all' show everything in the mock dataset.
      return all;
    });

    const filteredTasks = computed(() =>
      scopedTasks().filter((t) => matchesFilters(t, store.filters(), store.searchTerm())),
    );

    const sortedTasks = computed(() =>
      sortTasks(filteredTasks(), store.sortBy(), store.sortOrder()),
    );

    return {
      isLoading: computed(() => store.tasksResource.isLoading()),

      scopedTasks,
      filteredTasks,
      sortedTasks,

      totalRecords: computed(() => filteredTasks().length),

      pagedTasks: computed(() => {
        const start = store.pageNumber() * store.pageSize();
        return sortedTasks().slice(start, start + store.pageSize());
      }),

      columns: computed<KanbanColumn[]>(() => {
        const list = filteredTasks();
        return KANBAN_COLUMNS.map((status) => ({
          status,
          tasks: list.filter((t) => t.status === status),
        }));
      }),

      stats: computed<TaskStats>(() => {
        const list = scopedTasks();
        return {
          today: list.filter((t) => isDueToday(t)).length,
          upcoming: list.filter(
            (t) => t.dueDate > TODAY && t.status !== 'Completed' && t.status !== 'Cancelled',
          ).length,
          overdue: list.filter((t) => isOverdue(t)).length,
          completed: list.filter((t) => t.status === 'Completed').length,
          pendingReview: list.filter((t) => t.status === 'Review').length,
          inProgress: list.filter((t) => t.status === 'InProgress').length,
        };
      }),

      appliedFilterCount: computed(() => {
        const f = store.filters();
        return f ? Object.values(f).filter(Boolean).length : 0;
      }),
    };
  }),
  withMethods((store) => {
    const tasksApi = inject(TasksApi);
    const commonService = inject(Common);

    function upsertLocal(task: Task): void {
      const exists = store.allTasks().some((t) => t.id === task.id);
      patchState(store, {
        allTasks: exists
          ? store.allTasks().map((t) => (t.id === task.id ? task : t))
          : [task, ...store.allTasks()],
        selectedTask: store.selectedTask()?.id === task.id ? task : store.selectedTask(),
      });
    }

    return {
      setScope(scope: TaskScope): void {
        if (store.scope() !== scope) patchState(store, { scope, pageNumber: 0 });
      },

      setSelectedTask(task: Task | null): void {
        patchState(store, { selectedTask: task });
      },

      loadTasks(event: TableLazyLoadEvent): void {
        const rows = event.rows ?? store.pageSize();
        const page = Math.floor((event.first ?? 0) / rows);
        patchState(store, {
          pageNumber: page,
          pageSize: rows,
          sortBy: (event.sortField as string) ?? store.sortBy(),
          sortOrder: event.sortOrder === 1 ? 'asc' : 'desc',
        });
      },

      setSearchTerm(term: string): void {
        patchState(store, { searchTerm: term, pageNumber: 0 });
      },

      updateAppliedFilters(filters: TaskFilter | null): void {
        patchState(store, { filters, pageNumber: 0 });
      },

      reload(): void {
        store.tasksResource.reload();
      },

      changeStatus(task: Task, status: TaskStatus): void {
        const updated: Task = {
          ...task,
          status,
          completedDate: status === 'Completed' ? TODAY : null,
          progress: status === 'Completed' ? 100 : task.progress,
          updatedAt: TODAY,
        };
        upsertLocal(updated);
        tasksApi.changeStatus(updated).subscribe({
          next: (res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
          },
          error: (e: unknown) =>
            commonService.showMessage(e instanceof Error ? e.message : 'Update failed', 'error'),
        });
      },

      changeProgress(task: Task, progress: number): void {
        const updated: Task = { ...task, progress, updatedAt: TODAY };
        upsertLocal(updated);
        tasksApi.changeProgress(updated).subscribe();
      },

      saveTask(task: Task): void {
        upsertLocal(task);
      },

      deleteTask(task: Task): void {
        tasksApi.deleteTask(task.id).subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, { allTasks: store.allTasks().filter((t) => t.id !== task.id) });
            }
            commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          },
          error: (e: unknown) =>
            commonService.showMessage(e instanceof Error ? e.message : 'Delete failed', 'error'),
        });
      },

      addComment(task: Task, message: string): void {
        const trimmed = message.trim();
        if (!trimmed) return;
        const updated: Task = {
          ...task,
          comments: [
            ...task.comments,
            {
              id: `cmt-${task.comments.length + 1}-${task.id}`,
              author: 'You',
              initials: 'YO',
              message: trimmed,
              createdAt: TODAY,
            },
          ],
          updatedAt: TODAY,
        };
        upsertLocal(updated);
        tasksApi.addComment(updated).subscribe();
        commonService.showMessage('Comment added', 'success');
      },

      toggleChecklistItem(task: Task, itemId: string): void {
        const updated: Task = {
          ...task,
          checklist: task.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)),
          updatedAt: TODAY,
        };
        upsertLocal(updated);
      },
    };
  }),
);
