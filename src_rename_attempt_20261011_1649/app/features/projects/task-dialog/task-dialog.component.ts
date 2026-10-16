import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  form,
  FormField,
  max,
  maxLength,
  min,
  minLength,
  readonly,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from '@openng/optimus-ui/autocomplete';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ColorPickerModule } from '@openng/optimus-ui/colorpicker';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { FileSelectEvent, FileUploadModule } from '@openng/optimus-ui/fileupload';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';

import { Common } from '@core/services';
import { Assignee, ProjectTask, ProjectAttachment } from '@shared/interfaces';

import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../projects-nav';
import {
  emptyTaskForm,
  formToTask,
  isDueBeforeStart,
  TaskDialogMode,
  TaskFormModel,
  taskToForm,
} from './task-dialog.model';

interface TaskDialogData {
  task?: ProjectTask;
  mode?: TaskDialogMode;
  assignees?: Assignee[];
}

@Component({
  selector: 'app-task-dialog',
  imports: [
    FormField,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    InputNumberModule,
    ColorPickerModule,
    AutoCompleteModule,
    FileUploadModule,
  ],
  templateUrl: './task-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TaskDialogComponent {
  readonly #ref = inject(DynamicDialogRef);
  readonly #config = inject<DynamicDialogConfig<TaskDialogData>>(DynamicDialogConfig);
  readonly #common = inject(Common);

  readonly #data: TaskDialogData = this.#config.data ?? {};
  readonly mode = signal<TaskDialogMode>(this.#data.mode ?? 'create');
  readonly editable = computed(() => this.mode() !== 'view');
  readonly #base: ProjectTask | null = this.#data.task ?? null;
  readonly assignees: Assignee[] = this.#data.assignees ?? [];

  readonly attachments = signal<ProjectAttachment[]>(this.#base?.attachments ?? []);
  readonly tagSuggestions = signal<string[]>([]);

  readonly #model = signal<TaskFormModel>(this.#base ? taskToForm(this.#base) : emptyTaskForm());
  readonly model = this.#model.asReadonly();

  readonly statusOptions = STATUS_OPTIONS;
  readonly priorityOptions = PRIORITY_OPTIONS;

  readonly f = form(this.#model, (p) => {
    required(p.title, { message: 'Title is required' });
    minLength(p.title, 3, { message: 'Title must be at least 3 characters' });
    maxLength(p.title, 120, { message: 'Title must be 120 characters or fewer' });
    maxLength(p.description, 2000, { message: 'Description must be 2000 characters or fewer' });
    required(p.status, { message: 'Status is required' });
    required(p.priority, { message: 'Priority is required' });
    min(p.estimatedHours, 0, { message: 'Cannot be negative' });
    min(p.progress, 0, { message: 'Progress must be between 0 and 100' });
    max(p.progress, 100, { message: 'Progress must be between 0 and 100' });

    validate(p.dueDate, ({ value, valueOf }) =>
      isDueBeforeStart(value(), valueOf(p.startDate))
        ? { kind: 'dateOrder', message: 'Due date must be on or after the start date' }
        : undefined,
    );

    const whenReadonly = () => !this.editable();
    readonly(p.title, whenReadonly);
    readonly(p.description, whenReadonly);
    readonly(p.status, whenReadonly);
    readonly(p.priority, whenReadonly);
    readonly(p.assigneeId, whenReadonly);
    readonly(p.startDate, whenReadonly);
    readonly(p.dueDate, whenReadonly);
    readonly(p.estimatedHours, whenReadonly);
    readonly(p.progress, whenReadonly);
    readonly(p.color, whenReadonly);
    readonly(p.reminder, whenReadonly);
    readonly(p.notes, whenReadonly);
  });

  /** Offer the typed value as its own suggestion so Enter adds a free-form tag chip. */
  searchTag(event: AutoCompleteCompleteEvent): void {
    const query = event.query.trim().toLowerCase();
    this.tagSuggestions.set(query ? [query] : []);
  }

  onFilesSelected(event: FileSelectEvent): void {
    const files = event.files ?? [];
    if (!files.length) return;
    this.attachments.update((list) => [
      ...list,
      ...files.map((file, i) => ({
        id: `att-${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
      })),
    ]);
  }

  removeAttachment(id: string): void {
    this.attachments.update((list) => list.filter((a) => a.id !== id));
  }

  async save(): Promise<void> {
    const submitted = await submit(this.f, async () => {
      const model = this.#model();
      const assignee = this.assignees.find((a) => a.id === model.assigneeId);
      const task = formToTask(model, assignee, this.attachments(), this.#base ?? undefined);
      this.#ref.close(task);
      return undefined;
    });

    if (!submitted) {
      this.#common.showMessage('Please fix the highlighted fields', 'warn');
    }
  }

  enableEdit(): void {
    this.mode.set('edit');
  }

  cancel(): void {
    this.#ref.close();
  }
}
