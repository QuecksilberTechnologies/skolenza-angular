import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

import { Common } from '@core/services';
import { Task, TaskStatus } from '@shared/interfaces';

import { KANBAN_COLUMNS, STATUS_META } from '../tasks-nav';
import { TasksStore } from '../tasks.store';
import { TaskCard } from '../ui/task-card';
import { TaskCardShimmer } from '../ui/task-card-shimmer';

@Component({
  selector: 'app-tasks-kanban',
  host: { class: 'block overflow-hidden overflow-y-auto h-page p-4' },
  imports: [DragDropModule, SkeletonModule, TaskCard, TaskCardShimmer],
  providers: [TasksStore],
  templateUrl: './tasks-kanban.html',
  styleUrl: './tasks-kanban.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TasksKanban implements OnInit {
  readonly store = inject(TasksStore);
  readonly #router = inject(Router);
  readonly #common = inject(Common);

  protected readonly statusMeta = STATUS_META;

  /** Per-status Tailwind accent for the column dot + count pill (display only). */
  protected readonly accent: Record<TaskStatus, { dot: string; pill: string }> = {
    Todo: {
      dot: 'bg-gray-400',
      pill: 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-200',
    },
    InProgress: {
      dot: 'bg-sky-500',
      pill: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    },
    Blocked: {
      dot: 'bg-red-500',
      pill: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    },
    Review: {
      dot: 'bg-amber-500',
      pill: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    },
    Completed: {
      dot: 'bg-green-500',
      pill: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    },
    Cancelled: {
      dot: 'bg-gray-400',
      pill: 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-200',
    },
  };

  /** Placeholder lanes for the loading skeleton. */
  protected readonly skeletonLanes = [0, 1, 2, 3, 4];
  protected readonly skeletonCards = [0, 1, 2];

  ngOnInit(): void {
    this.store.setScope('all');
    this.#common.setPageHeaderInfo({
      pageTitle: 'Task Board',
      pageDescription: 'Drag tasks across stages to update status',
      pageIcon: 'pi pi-th-large',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([
      { label: 'Tasks', routerLink: '/app/tasks/dashboard' },
      { label: 'Board' },
    ]);
  }

  /** All lane ids so every list is a connected drop target. */
  readonly dropListIds = KANBAN_COLUMNS.map((s) => `lane-${s}`);

  laneId(status: TaskStatus): string {
    return `lane-${status}`;
  }

  onDrop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    if (event.previousContainer === event.container) return;
    const task = event.item.data as Task;
    if (task.status !== targetStatus) {
      this.store.changeStatus(task, targetStatus);
    }
  }

  open(task: Task): void {
    this.#router.navigate(['/app/tasks', task.id]);
  }
}
