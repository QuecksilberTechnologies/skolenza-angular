import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { SelectModule } from '@openng/optimus-ui/select';

import { Common, TasksApi } from '@core/services';
import { AuthStore } from '@core/stores';
import { Task, TaskStatus } from '@shared/interfaces';

import { STATUS_OPTIONS, TODAY } from '../tasks-nav';
import { TaskPriorityBadge } from '../ui/task-priority-badge';
import { TaskStatusTag } from '../ui/task-status-tag';
import { TaskActivityTimeline } from './task-activity/task-activity';
import { TaskAttachments } from './task-attachments/task-attachments';
import { TaskChecklist } from './task-checklist/task-checklist';
import { TaskComments } from './task-comments/task-comments';
import { TaskSummary } from './task-summary/task-summary';

@Component({
  selector: 'app-task-detail',
  host: { class: 'block overflow-hidden overflow-y-auto h-page p-4' },
  imports: [
    FormsModule,
    ButtonModule,
    CardModule,
    SelectModule,
    ConfirmDialogModule,
    TaskStatusTag,
    TaskPriorityBadge,
    TaskSummary,
    TaskChecklist,
    TaskComments,
    TaskAttachments,
    TaskActivityTimeline,
  ],
  providers: [ConfirmationService],
  templateUrl: './task-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TaskDetail implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #tasksApi = inject(TasksApi);
  readonly #common = inject(Common);
  readonly #confirm = inject(ConfirmationService);
  readonly #authStore = inject(AuthStore);
  readonly #destroyRef = inject(DestroyRef);

  readonly task = signal<Task | null>(null);
  readonly isLoading = signal(false);

  readonly statusOptions = STATUS_OPTIONS;

  /** Admin (1) or Manager (3) may edit/delete/approve; StaffMember (2) is read-only for those. */
  readonly canManage = computed(() => {
    const role = this.#authStore.roleTypeId();
    return role === 1 || role === 3;
  });

  readonly canApprove = computed(() => this.canManage() && this.task()?.status === 'Review');

  ngOnInit(): void {
    const id = this.#route.snapshot.paramMap.get('id');
    this.#common.setPageHeaderInfo({
      pageTitle: 'Task Details',
      pageDescription: 'Review and update task progress',
      pageIcon: 'pi pi-check-square',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([
      { label: 'Tasks', routerLink: '/app/tasks/dashboard' },
      { label: 'Details' },
    ]);
    if (id) this.#load(id);
  }

  #load(id: string): void {
    this.isLoading.set(true);
    this.#tasksApi
      .getTaskById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.isSucceeded && res.data) {
            this.task.set(res.data);
          } else {
            this.#common.showMessage('Task not found', 'error');
            this.#router.navigateByUrl('/app/tasks/list');
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.#common.showMessage('Failed to load task', 'error');
        },
      });
  }

  onStatusChange(status: TaskStatus): void {
    const current = this.task();
    if (!current || current.status === status) return;
    const updated: Task = {
      ...current,
      status,
      completedDate: status === 'Completed' ? TODAY : null,
      progress: status === 'Completed' ? 100 : current.progress,
      updatedAt: TODAY,
    };
    this.task.set(updated);
    this.#tasksApi.changeStatus(updated).subscribe();
    this.#common.showMessage('Status updated', 'success');
  }

  approve(): void {
    this.onStatusChange('Completed');
  }

  addComment(message: string): void {
    const current = this.task();
    if (!current) return;
    const updated: Task = {
      ...current,
      comments: [
        ...current.comments,
        {
          id: `cmt-${current.comments.length + 1}-${current.id}`,
          author: 'You',
          initials: 'YO',
          message,
          createdAt: TODAY,
        },
      ],
      updatedAt: TODAY,
    };
    this.task.set(updated);
    this.#tasksApi.addComment(updated).subscribe();
    this.#common.showMessage('Comment added', 'success');
  }

  toggleChecklist(itemId: string): void {
    const current = this.task();
    if (!current) return;
    this.task.set({
      ...current,
      checklist: current.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)),
      updatedAt: TODAY,
    });
  }

  onUpload(): void {
    this.#common.showMessage('Attachment upload is disabled in the demo build', 'info');
  }

  edit(): void {
    const t = this.task();
    if (t) this.#router.navigate(['/app/tasks', t.id, 'edit']);
  }

  confirmDelete(): void {
    const t = this.task();
    if (!t) return;
    this.#confirm.confirm({
      message: `This will permanently delete <strong>${t.title}</strong>. This action cannot be undone.`,
      header: 'Delete task',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete',
      rejectLabel: 'Keep',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.#tasksApi.deleteTask(t.id).subscribe((res) => {
          this.#common.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) this.#router.navigateByUrl('/app/tasks/list');
        });
      },
    });
  }

  back(): void {
    this.#router.navigateByUrl('/app/tasks/list');
  }
}
