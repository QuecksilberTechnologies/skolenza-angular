import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';

import { GOAL_CATEGORIES, Goal, PMS_STATUS_OPTIONS } from '@shared/interfaces';

import { PmsGoalsStore } from '../pms-goals.store';
import { emptyGoalForm, formToGoal, goalToForm } from './pms-goal-form.model';

interface GoalDialogData {
  goal?: Goal;
  store: InstanceType<typeof PmsGoalsStore>;
}

@Component({
  selector: 'app-pms-goal-form',
  imports: [
    FormField,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './pms-goal-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsGoalForm {
  readonly #ref = inject(DynamicDialogRef);
  readonly #config = inject<DynamicDialogConfig<GoalDialogData>>(DynamicDialogConfig);

  readonly #data = this.#config.data;
  readonly #editing = this.#data?.goal;
  readonly isEdit = signal(!!this.#editing);
  readonly isSaving = signal(false);

  readonly #model = signal(this.#editing ? goalToForm(this.#editing) : emptyGoalForm());

  readonly categoryOptions = [...GOAL_CATEGORIES];
  readonly statusOptions = PMS_STATUS_OPTIONS;

  readonly f = form(this.#model, (p) => {
    required(p.title, { message: 'Title is required' });
    minLength(p.title, 3, { message: 'Title must be at least 3 characters' });
    required(p.description, { message: 'Description is required' });
    maxLength(p.description, 500, { message: 'Description must be 500 characters or fewer' });
    required(p.category, { message: 'Category is required' });
    required(p.startDate, { message: 'Start date is required' });
    required(p.dueDate, { message: 'Due date is required' });
    min(p.weight, 0, { message: 'Weight cannot be negative' });
    max(p.weight, 100, { message: 'Weight cannot exceed 100' });
    min(p.progress, 0, { message: 'Progress must be 0–100' });
    max(p.progress, 100, { message: 'Progress must be 0–100' });

    validate(p.dueDate, ({ value, valueOf }) => {
      const due = value();
      const start = valueOf(p.startDate);
      if (start && due && due < start) {
        return { kind: 'dateOrder', message: 'Due date must be on or after the start date' };
      }
      return null;
    });
  });

  async save(): Promise<void> {
    const submitted = await submit(this.f, async () => {
      this.isSaving.set(true);
      const goal = formToGoal(this.#model(), this.#editing);
      this.#data?.store.saveGoal(goal);
      this.isSaving.set(false);
      this.#ref.close(true);
      return undefined;
    });
    if (!submitted) return;
  }

  cancel(): void {
    this.#ref.close(false);
  }
}
