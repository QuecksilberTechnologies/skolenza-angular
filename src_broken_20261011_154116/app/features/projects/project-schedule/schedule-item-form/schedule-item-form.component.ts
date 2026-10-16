import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required, submit, validate } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';

import { Common } from '@core/services';
import { NewProjectScheduleItem, ProjectScheduleItem, ScheduleItemType } from '@shared/interfaces';

import { SCHEDULE_TYPE_OPTIONS } from '../../projects-nav';

interface LinkedTaskOption {
  label: string;
  value: string;
}

interface ScheduleItemFormModel {
  title: string;
  type: ScheduleItemType;
  allDay: boolean;
  start: Date | null;
  end: Date | null;
  location: string;
  description: string;
  linkedTaskId: string;
  reminder: Date | null;
}

interface ScheduleFormData {
  item?: ProjectScheduleItem;
  start?: Date;
  end?: Date;
  allDay?: boolean;
  linkedTasks?: LinkedTaskOption[];
}

@Component({
  selector: 'app-schedule-item-form',
  imports: [
    FormField,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    ToggleSwitchModule,
  ],
  templateUrl: './schedule-item-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ScheduleItemFormComponent {
  readonly #ref = inject(DynamicDialogRef);
  readonly #config = inject<DynamicDialogConfig<ScheduleFormData>>(DynamicDialogConfig);
  readonly #common = inject(Common);

  readonly #data: ScheduleFormData = this.#config.data ?? {};
  readonly #base: ProjectScheduleItem | null = this.#data.item ?? null;
  readonly isEdit = !!this.#base;
  readonly linkedTasks: LinkedTaskOption[] = this.#data.linkedTasks ?? [];
  readonly typeOptions = SCHEDULE_TYPE_OPTIONS;

  readonly #model = signal<ScheduleItemFormModel>(
    this.#base
      ? {
          title: this.#base.title,
          type: this.#base.type,
          allDay: this.#base.allDay,
          start: new Date(this.#base.start),
          end: this.#base.end ? new Date(this.#base.end) : null,
          location: this.#base.location ?? '',
          description: this.#base.description ?? '',
          linkedTaskId: this.#base.linkedTaskId ?? '',
          reminder: this.#base.reminder ? new Date(this.#base.reminder) : null,
        }
      : {
          title: '',
          type: 'meeting',
          allDay: this.#data.allDay ?? false,
          start: this.#data.start ?? new Date(),
          end: this.#data.end ?? null,
          location: '',
          description: '',
          linkedTaskId: '',
          reminder: null,
        },
  );
  readonly model = this.#model.asReadonly();
  readonly showTime = computed(() => !this.model().allDay);

  readonly f = form(this.#model, (p) => {
    required(p.title, { message: 'Title is required' });
    required(p.type, { message: 'Type is required' });
    required(p.start, { message: 'Start date is required' });
    validate(p.end, ({ value, valueOf }) => {
      const end = value();
      const start = valueOf(p.start);
      return end && start && end < start
        ? { kind: 'dateOrder', message: 'End must be on or after the start' }
        : undefined;
    });
  });

  async save(): Promise<void> {
    const submitted = await submit(this.f, async () => {
      this.#ref.close(this.#toItem(this.#model()));
      return undefined;
    });
    if (!submitted) this.#common.showMessage('Please fix the highlighted fields', 'warn');
  }

  cancel(): void {
    this.#ref.close();
  }

  #toItem(m: ScheduleItemFormModel): ProjectScheduleItem | NewProjectScheduleItem {
    const start = m.start ?? new Date();
    const item: NewProjectScheduleItem = {
      title: m.title.trim(),
      type: m.type,
      allDay: m.allDay,
      start,
      end: m.end ?? undefined,
      location: m.location.trim() || undefined,
      description: m.description.trim() || undefined,
      linkedTaskId: m.linkedTaskId || undefined,
      reminder: m.reminder,
    };
    return this.#base ? { ...item, id: this.#base.id } : item;
  }
}
