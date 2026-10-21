import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  max,
  maxLength,
  min,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';

import { Common, TasksApi } from '@core/services';
import { Task, TaskAssignee, TaskCategory } from '@shared/interfaces';

import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../tasks-nav';
import { isDueBeforeStart } from '../validators/task-date.validator';
import { emptyTaskForm, formToTask, taskToForm, TaskFormModel } from './task-form.model';

@Component({
  selector: 'app-task-form',
  host: { class: 'block overflow-hidden overflow-y-auto h-page p-4' },
  imports: [
    FormField,
    ButtonModule,
    CardModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './task-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TaskForm implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #tasksApi = inject(TasksApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);

  readonly #editing = signal<Task | null>(null);
  readonly isEdit = signal(false);
  readonly isSaving = signal(false);
  readonly isLoading = signal(false);

  readonly assignees = signal<TaskAssignee[]>([]);
  readonly categories = signal<TaskCategory[]>([]);
  readonly tagInput = signal('');

  readonly #model = signal<TaskFormModel>(emptyTaskForm());
  readonly model = this.#model.asReadonly();

  readonly statusOptions = STATUS_OPTIONS;
  readonly priorityOptions = PRIORITY_OPTIONS;

  readonly f = form(this.#model, (p) => {
    required(p.title, { message: 'Title is required' });
    minLength(p.title, 3, { message: 'Title must be at least 3 characters' });
    maxLength(p.title, 120, { message: 'Title must be 120 characters or fewer' });
    maxLength(p.description, 2000, { message: 'Description must be 2000 characters or fewer' });
    required(p.assigneeId, { message: 'Assignee is required' });
    required(p.startDate, { message: 'Start date is required' });
    required(p.dueDate, { message: 'Due date is required' });
    min(p.estimatedHours, 0, { message: 'Cannot be negative' });
    min(p.actualHours, 0, { message: 'Cannot be negative' });
    min(p.progress, 0, { message: 'Progress must be between 0 and 100' });
    max(p.progress, 100, { message: 'Progress must be between 0 and 100' });

    validate(p.dueDate, ({ value, valueOf }) => {
      if (isDueBeforeStart(value(), valueOf(p.startDate))) {
        return { kind: 'dateOrder', message: 'Due date must be on or after the start date' };
      }
      return null;
    });
  });

  ngOnInit(): void {
    this.isEdit.set(this.#route.snapshot.data['mode'] === 'edit');
    const id = this.#route.snapshot.paramMap.get('id');

    this.#common.setPageHeaderInfo({
      pageTitle: this.isEdit() ? 'Edit Task' : 'Create Task',
      pageDescription: 'Capture the work, owner, and timeline',
      pageIcon: 'pi pi-check-square',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([
      { label: 'Tasks', routerLink: '/app/tasks/list' },
      { label: this.isEdit() ? 'Edit Task' : 'Create Task' },
    ]);

    this.#tasksApi.getTaskMeta().subscribe((res) => {
      if (res.isSucceeded) {
        this.assignees.set(res.data.assignees);
        this.categories.set(res.data.categories);
      }
    });

    if (this.isEdit() && id) this.#loadTask(id);
  }

  #loadTask(id: string): void {
    this.isLoading.set(true);
    this.#tasksApi
      .getTaskById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.isSucceeded && res.data) {
            this.#editing.set(res.data);
            this.#model.set(taskToForm(res.data));
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

  addTag(): void {
    const value = this.tagInput().trim().toLowerCase();
    if (!value) return;
    this.#model.update((m) => (m.tags.includes(value) ? m : { ...m, tags: [...m.tags, value] }));
    this.tagInput.set('');
  }

  removeTag(tag: string): void {
    this.#model.update((m) => ({ ...m, tags: m.tags.filter((t) => t !== tag) }));
  }

  async save(): Promise<void> {
    const submitted = await submit(this.f, async () => {
      this.isSaving.set(true);
      const model = this.#model();
      const assigneeName =
        this.assignees().find((a) => a.id === model.assigneeId)?.name ?? model.assigneeId;
      const payload = formToTask(model, assigneeName, this.#editing() ?? undefined);
      const request$ = this.isEdit()
        ? this.#tasksApi.updateTask(payload)
        : this.#tasksApi.createTask(payload);

      const res = await new Promise<{ isSucceeded: boolean; message: string; data?: Task }>(
        (resolve) =>
          request$.subscribe({
            next: (r) => resolve(r),
            error: (e: Error) => resolve({ isSucceeded: false, message: e.message }),
          }),
      );

      this.isSaving.set(false);
      this.#common.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
      if (res.isSucceeded && res.data) {
        this.#router.navigate(['/app/tasks', res.data.id]);
      }
      return undefined;
    });

    if (!submitted) {
      this.#common.showMessage('Please fix the highlighted fields', 'warn');
    }
  }

  cancel(): void {
    this.#router.navigateByUrl('/app/tasks/list');
  }
}
