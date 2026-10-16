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
import { map, tap } from 'rxjs';

import { Common, ProjectsApi } from '@core/services';
import {
  Assignee,
  NewProjectScheduleItem,
  ProjectScheduleItem,
  ProjectTask,
  ProjectTaskFilter,
  ProjectTaskStatus,
} from '@shared/interfaces';

import { isDueToday, isOverdue, KANBAN_COLUMNS, SCHEDULE_TYPE_META, TODAY } from './projects-nav';

export interface KanbanColumn {
  status: ProjectTaskStatus;
  tasks: ProjectTask[];
}

export interface ProjectBoardStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
  dueToday: number;
  avgProgress: number;
}

interface ProjectBoardState {
  allTasks: ProjectTask[];
  scheduleItems: ProjectScheduleItem[];
  selectedTask: ProjectTask | null;
  selectedIds: string[];
  filters: ProjectTaskFilter | null;
  searchTerm: string;
  pageNumber: number;
  pageSize: number;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  loaded: boolean;
}

const initialState: ProjectBoardState = {
  allTasks: [],
  scheduleItems: [],
  selectedTask: null,
  selectedIds: [],
  filters: null,
  searchTerm: '',
  pageNumber: 0,
  pageSize: 10,
  sortBy: null,
  sortOrder: 'desc',
  loaded: false,
};

function hydrateTask(t: ProjectTask): ProjectTask {
  return {
    ...t,
    startDate: t.startDate ? new Date(t.startDate) : undefined,
    dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
    reminder: t.reminder ? new Date(t.reminder) : null,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
  };
}

function hydrateScheduleItem(i: ProjectScheduleItem): ProjectScheduleItem {
  const color = SCHEDULE_TYPE_META[i.type]?.color ?? '#3b82f6';
  return {
    ...i,
    start: new Date(i.start),
    end: i.end ? new Date(i.end) : undefined,
    reminder: i.reminder ? new Date(i.reminder) : null,
    backgroundColor: color,
    borderColor: color,
    color: '#ffffff',
  };
}

function matchesFilters(
  task: ProjectTask,
  filters: ProjectTaskFilter | null,
  term: string,
): boolean {
  if (filters?.status && task.status !== filters.status) return false;
  if (filters?.priority && task.priority !== filters.priority) return false;
  if (filters?.assigneeId && task.assignee?.id !== filters.assigneeId) return false;
  if (filters?.tag && !(task.tags ?? []).includes(filters.tag)) return false;
  if (term) {
    const q = term.toLowerCase();
    const haystack = `${task.title} ${task.description ?? ''} ${task.assignee?.name ?? ''} ${(
      task.tags ?? []
    ).join(' ')}`;
    if (!haystack.toLowerCase().includes(q)) return false;
  }
  return true;
}

function sortTasks(
  list: ProjectTask[],
  sortBy: string | null,
  order: 'asc' | 'desc',
): ProjectTask[] {
  if (!sortBy) return list;
  const dir = order === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const av = a[sortBy as keyof ProjectTask];
    const bv = b[sortBy as keyof ProjectTask];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

export const ProjectBoardStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const projectsApi = inject(ProjectsApi);
    const common = inject(Common);

    const tasksResource = rxResource({
      params: () => true,
      stream: () =>
        projectsApi.fetchProjectTasks().pipe(
          map((tasks) => tasks.map(hydrateTask)),
          tap((tasks) => patchState(store, { allTasks: tasks, loaded: true })),
        ),
    });

    const scheduleResource = rxResource({
      params: () => true,
      stream: () =>
        projectsApi.fetchSchedule().pipe(
          map((res) => (res.isSucceeded ? res.data.map(hydrateScheduleItem) : [])),
          tap((items) => {
            if (items.length === 0) common.showMessage('No schedule items found', 'info');
            patchState(store, { scheduleItems: items });
          }),
        ),
    });

    return { tasksResource, scheduleResource };
  }),
  withComputed((store) => {
    const activeTasks = computed(() => store.allTasks().filter((t) => !t.archived));

    const filteredTasks = computed(() =>
      activeTasks().filter((t) => matchesFilters(t, store.filters(), store.searchTerm())),
    );

    const sortedTasks = computed(() =>
      sortTasks(filteredTasks(), store.sortBy(), store.sortOrder()),
    );

    return {
      isLoading: computed(() => store.tasksResource.isLoading()),

      activeTasks,
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

      assignees: computed<Assignee[]>(() => {
        const map = new Map<string, Assignee>();
        for (const t of store.allTasks()) {
          if (t.assignee && !map.has(t.assignee.id)) map.set(t.assignee.id, t.assignee);
        }
        return [...map.values()];
      }),

      allTags: computed<string[]>(() => {
        const set = new Set<string>();
        for (const t of store.allTasks()) (t.tags ?? []).forEach((tag) => set.add(tag));
        return [...set].sort();
      }),

      stats: computed<ProjectBoardStats>(() => {
        const list = activeTasks();
        const withProgress = list.filter((t) => t.progress != null);
        return {
          total: list.length,
          todo: list.filter((t) => t.status === 'todo').length,
          inProgress: list.filter((t) => t.status === 'in-progress').length,
          review: list.filter((t) => t.status === 'review').length,
          done: list.filter((t) => t.status === 'done').length,
          overdue: list.filter((t) => isOverdue(t)).length,
          dueToday: list.filter((t) => isDueToday(t)).length,
          avgProgress: withProgress.length
            ? Math.round(
                withProgress.reduce((sum, t) => sum + (t.progress ?? 0), 0) / withProgress.length,
              )
            : 0,
        };
      }),

      appliedFilterCount: computed(() => {
        const f = store.filters();
        return f ? Object.values(f).filter(Boolean).length : 0;
      }),

      upcomingSchedule: computed<ProjectScheduleItem[]>(() =>
        [...store.scheduleItems()]
          .filter((i) => i.start >= TODAY)
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .slice(0, 6),
      ),
    };
  }),
  withMethods((store) => {
    const common = inject(Common);

    function upsertLocal(task: ProjectTask): void {
      const exists = store.allTasks().some((t) => t.id === task.id);
      patchState(store, {
        allTasks: exists
          ? store.allTasks().map((t) => (t.id === task.id ? task : t))
          : [task, ...store.allTasks()],
        selectedTask: store.selectedTask()?.id === task.id ? task : store.selectedTask(),
      });
    }

    return {
      setSearchTerm(term: string): void {
        patchState(store, { searchTerm: term, pageNumber: 0 });
      },

      updateFilters(filters: ProjectTaskFilter | null): void {
        patchState(store, { filters, pageNumber: 0 });
      },

      clearFilters(): void {
        patchState(store, { filters: null, searchTerm: '', pageNumber: 0 });
      },

      loadTasks(event: TableLazyLoadEvent): void {
        const rows = event.rows ?? store.pageSize();
        patchState(store, {
          pageNumber: Math.floor((event.first ?? 0) / rows),
          pageSize: rows,
          sortBy: (event.sortField as string) ?? store.sortBy(),
          sortOrder: event.sortOrder === 1 ? 'asc' : 'desc',
        });
      },

      setSelectedTask(task: ProjectTask | null): void {
        patchState(store, { selectedTask: task });
      },

      saveTask(task: ProjectTask): void {
        upsertLocal(task);
        common.showMessage('Task saved', 'success');
      },

      changeStatus(task: ProjectTask, status: ProjectTaskStatus): void {
        upsertLocal({
          ...task,
          status,
          progress: status === 'done' ? 100 : task.progress,
          updatedAt: new Date(),
        });
      },

      changeProgress(task: ProjectTask, progress: number): void {
        upsertLocal({ ...task, progress, updatedAt: new Date() });
      },

      duplicateTask(task: ProjectTask): void {
        const now = new Date();
        upsertLocal({
          ...task,
          id: `PT-${now.getTime()}`,
          title: `${task.title} (Copy)`,
          createdAt: now,
          updatedAt: now,
        });
        common.showMessage('Task duplicated', 'success');
      },

      archiveTask(task: ProjectTask): void {
        upsertLocal({ ...task, archived: true, updatedAt: new Date() });
        common.showMessage('Task archived', 'success');
      },

      deleteTask(task: ProjectTask): void {
        patchState(store, {
          allTasks: store.allTasks().filter((t) => t.id !== task.id),
          selectedIds: store.selectedIds().filter((id) => id !== task.id),
        });
        common.showMessage('Task deleted', 'warn');
      },

      // Bulk selection
      toggleSelected(id: string): void {
        const set = new Set(store.selectedIds());
        if (set.has(id)) {
          set.delete(id);
        } else {
          set.add(id);
        }
        patchState(store, { selectedIds: [...set] });
      },

      setSelectedIds(ids: string[]): void {
        patchState(store, { selectedIds: ids });
      },

      clearSelection(): void {
        patchState(store, { selectedIds: [] });
      },

      bulkDelete(ids: string[]): void {
        const set = new Set(ids);
        patchState(store, {
          allTasks: store.allTasks().filter((t) => !set.has(t.id)),
          selectedIds: [],
        });
        common.showMessage(`${ids.length} task(s) deleted`, 'warn');
      },

      bulkChangeStatus(ids: string[], status: ProjectTaskStatus): void {
        const set = new Set(ids);
        patchState(store, {
          allTasks: store.allTasks().map((t) =>
            set.has(t.id)
              ? {
                  ...t,
                  status,
                  progress: status === 'done' ? 100 : t.progress,
                  updatedAt: new Date(),
                }
              : t,
          ),
          selectedIds: [],
        });
        common.showMessage(`${ids.length} task(s) updated`, 'success');
      },

      // Schedule items
      saveScheduleItem(item: ProjectScheduleItem | NewProjectScheduleItem): void {
        const type = item.type as ProjectScheduleItem['type'];
        const color = SCHEDULE_TYPE_META[type]?.color ?? '#3b82f6';
        const withColor = { ...item, backgroundColor: color, borderColor: color, color: '#ffffff' };
        const id = 'id' in item && item.id ? item.id : `SCH-${Date.now()}`;
        const full = { ...withColor, id } as ProjectScheduleItem;
        const exists = store.scheduleItems().some((i) => i.id === id);
        patchState(store, {
          scheduleItems: exists
            ? store.scheduleItems().map((i) => (i.id === id ? full : i))
            : [...store.scheduleItems(), full],
        });
        common.showMessage('Schedule item saved', 'success');
      },

      updateScheduleDates(id: string, start: Date, end?: Date): void {
        patchState(store, {
          scheduleItems: store.scheduleItems().map((i) => (i.id === id ? { ...i, start, end } : i)),
        });
      },

      deleteScheduleItem(id: string): void {
        patchState(store, {
          scheduleItems: store.scheduleItems().filter((i) => i.id !== id),
        });
        common.showMessage('Schedule item deleted', 'warn');
      },

      reload(): void {
        store.tasksResource.reload();
        store.scheduleResource.reload();
      },
    };
  }),
);
