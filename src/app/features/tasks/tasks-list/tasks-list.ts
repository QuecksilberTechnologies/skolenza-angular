import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';

import { Common, TasksApi } from '@core/services';
import { AuthStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { Task, TaskFilter, TaskMeta, TaskScope } from '@shared/interfaces';

import { TasksStore } from '../tasks.store';
import { TaskFilterBar } from '../ui/task-filter-bar';
import { TaskPriorityBadge } from '../ui/task-priority-badge';
import { TaskProgress } from '../ui/task-progress';
import { TaskStatusTag } from '../ui/task-status-tag';

interface ScopeMeta {
  title: string;
  description: string;
  icon: string;
}

const SCOPE_META: Record<TaskScope, ScopeMeta> = {
  all: { title: 'All Tasks', description: 'Every task across the workspace', icon: 'pi pi-list' },
  my: { title: 'My Tasks', description: 'Tasks assigned to you', icon: 'pi pi-user' },
  team: { title: 'Team Tasks', description: 'Tasks across your team', icon: 'pi pi-users' },
};

@Component({
  selector: 'app-tasks-list',
  host: { class: 'block overflow-hidden overflow-y-auto h-page p-4' },
  imports: [
    DatePipe,
    TableModule,
    CardModule,
    ButtonModule,
    MenuModule,
    ConfirmDialogModule,
    TableLoader,
    TableEmptyMessage,
    TaskFilterBar,
    TaskStatusTag,
    TaskPriorityBadge,
    TaskProgress,
  ],
  providers: [TasksStore, ConfirmationService],
  templateUrl: './tasks-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TasksList implements OnInit {
  readonly store = inject(TasksStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #tasksApi = inject(TasksApi);
  readonly #confirm = inject(ConfirmationService);
  readonly #common = inject(Common);
  readonly #authStore = inject(AuthStore);

  readonly table = viewChild<Table>('dt');
  readonly meta = signal<TaskMeta>({ categories: [], tags: [], assignees: [] });

  protected selectedRow!: Task;
  protected actionMenuItems: MenuItem[] = [];

  /** Admin (1) or Manager (3) may mutate; StaffMember (2) is read-only. */
  protected readonly canManage = computed(() => {
    const role = this.#authStore.roleTypeId();
    return role === 1 || role === 3;
  });

  constructor() {
    this.actionMenuItems = [
      { label: 'View details', icon: 'pi pi-eye', command: () => this.view(this.selectedRow) },
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        visible: false,
        command: () => this.edit(this.selectedRow),
      },
      { separator: true, visible: false },
      {
        label: 'Delete',
        icon: 'pi pi-trash !text-red-500',
        styleClass: '!text-red-500 font-medium',
        visible: false,
        command: () => this.confirmDelete(this.selectedRow),
      },
    ];
  }

  ngOnInit(): void {
    const scope = (this.#route.snapshot.data['scope'] as TaskScope) ?? 'all';
    this.store.setScope(scope);

    const m = SCOPE_META[scope];
    this.#common.setPageHeaderInfo({
      pageTitle: m.title,
      pageDescription: m.description,
      pageIcon: m.icon,
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([
      { label: 'Tasks', routerLink: '/app/tasks/dashboard' },
      { label: m.title },
    ]);

    this.#tasksApi.getTaskMeta().subscribe((res) => {
      if (res.isSucceeded) this.meta.set(res.data);
    });
  }

  openRowMenu(task: Task): void {
    this.selectedRow = task;
    const manage = this.canManage();
    [1, 2, 3].forEach((i) => (this.actionMenuItems[i].visible = manage));
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.store.loadTasks(event);
  }

  onSearch(term: string): void {
    this.store.setSearchTerm(term);
  }

  onFilterChange(filters: TaskFilter): void {
    this.store.updateAppliedFilters(filters);
  }

  clearFilters(): void {
    this.store.updateAppliedFilters(null);
  }

  view(task: Task): void {
    this.#router.navigate(['/app/tasks', task.id]);
  }

  edit(task: Task): void {
    this.#router.navigate(['/app/tasks', task.id, 'edit']);
  }

  create(): void {
    this.#router.navigate(['/app/tasks/create']);
  }

  exportCsv(): void {
    this.table()?.exportCSV();
  }

  confirmDelete(task: Task): void {
    this.#confirm.confirm({
      message: `This will permanently delete <strong>${task.title}</strong>. This action cannot be undone.`,
      header: 'Delete task',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete',
      rejectLabel: 'Keep',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteTask(task),
    });
  }
}
