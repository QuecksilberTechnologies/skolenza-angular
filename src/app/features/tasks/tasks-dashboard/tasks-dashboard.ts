import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';

import { Common } from '@core/services';
import { SectionCard } from '@shared/components/section-card/section-card';
import { Task, TaskActivity } from '@shared/interfaces';

import { isDueToday, isOverdue, TODAY } from '../tasks-nav';
import { TasksStore } from '../tasks.store';
import { TaskKpiCards } from '../ui/task-kpi-cards';
import { TaskPriorityBadge } from '../ui/task-priority-badge';
import { TaskProgress } from '../ui/task-progress';
import { TaskStatusTag } from '../ui/task-status-tag';

interface ActivityRow extends TaskActivity {
  taskId: string;
  taskTitle: string;
}

@Component({
  selector: 'app-tasks-dashboard',
  host: { class: 'block overflow-hidden overflow-y-auto h-[calc(100vh-4.6rem)] p-4' },
  imports: [
    SectionCard,
    ButtonModule,
    TaskKpiCards,
    TaskStatusTag,
    TaskPriorityBadge,
    TaskProgress,
  ],
  providers: [TasksStore],
  templateUrl: './tasks-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TasksDashboard implements OnInit {
  readonly store = inject(TasksStore);
  readonly #router = inject(Router);
  readonly #common = inject(Common);

  readonly todayTasks = computed(() => this.store.scopedTasks().filter((t) => isDueToday(t)));

  readonly upcomingTasks = computed(() =>
    this.store
      .scopedTasks()
      .filter((t) => t.dueDate > TODAY && t.status !== 'Completed' && t.status !== 'Cancelled')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6),
  );

  readonly overdueTasks = computed(() =>
    this.store
      .scopedTasks()
      .filter((t) => isOverdue(t))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  );

  readonly reviewTasks = computed(() =>
    this.store.scopedTasks().filter((t) => t.status === 'Review'),
  );

  readonly recentActivity = computed<ActivityRow[]>(() =>
    this.store
      .scopedTasks()
      .flatMap((t) => t.activity.map((a) => ({ ...a, taskId: t.id, taskTitle: t.title })))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8),
  );

  ngOnInit(): void {
    this.store.setScope('all');
    this.#common.setPageHeaderInfo({
      pageTitle: 'Task Dashboard',
      pageDescription: 'Your task workload at a glance',
      pageIcon: 'pi pi-gauge',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([{ label: 'Tasks' }, { label: 'Dashboard' }]);
  }

  open(task: Task): void {
    this.#router.navigate(['/app/tasks', task.id]);
  }

  openTask(taskId: string): void {
    this.#router.navigate(['/app/tasks', taskId]);
  }

  goToBoard(): void {
    this.#router.navigate(['/app/tasks/board']);
  }
}
