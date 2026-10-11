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
import {
  applyEach,
  form,
  FormField,
  max,
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
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common, OkrApi } from '@core/services';
import { IOkr, OkrLevel, OkrStatus, OkrVisibility } from '@shared/interfaces';

import { resolveOkrOrigin } from '../okr-nav';
import { emptyKeyResult, emptyOkrForm, formToOkr, OkrFormModel, okrToForm } from './okr-form.model';

@Component({
  selector: 'app-okr-form',
  imports: [
    FormField,
    ButtonModule,
    CardModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
  ],
  templateUrl: './okr-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class OkrForm implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #okrApi = inject(OkrApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);

  readonly #editingOkr = signal<IOkr | null>(null);
  readonly isEdit = signal(false);
  readonly isSaving = signal(false);
  readonly isLoading = signal(false);

  readonly #model = signal<OkrFormModel>(emptyOkrForm());

  get #from(): string | null {
    return this.#route.snapshot.queryParamMap.get('from');
  }

  /** Signal Form with declarative validation rules. */
  readonly f = form(this.#model, (p) => {
    required(p.title, { message: 'Title is required' });
    minLength(p.title, 3, { message: 'Title must be at least 3 characters' });
    required(p.objective, { message: 'Objective is required' });
    required(p.ownerName, { message: 'Owner is required' });
    required(p.departmentId, { message: 'Department is required' });
    required(p.level, { message: 'Level is required' });
    required(p.quarter, { message: 'Quarter is required' });
    required(p.startDate, { message: 'Start date is required' });
    required(p.endDate, { message: 'End date is required' });
    min(p.weight, 0, { message: 'Weight cannot be negative' });
    max(p.weight, 100, { message: 'Weight cannot exceed 100' });
    min(p.progress, 0, { message: 'Progress must be between 0 and 100' });
    max(p.progress, 100, { message: 'Progress must be between 0 and 100' });

    // End date must be after start date.
    validate(p.endDate, ({ value, valueOf }) => {
      const end = value();
      const start = valueOf(p.startDate);
      if (start && end && end < start) {
        return { kind: 'dateOrder', message: 'End date must be on or after the start date' };
      }
      return null;
    });

    // Per key-result rules.
    applyEach(p.keyResults, (kr) => {
      required(kr.title, { message: 'Required' });
      required(kr.metric, { message: 'Required' });
      required(kr.unit, { message: 'Required' });
      min(kr.target, 0, { message: 'Min 0' });
      min(kr.weight, 0, { message: 'Min 0' });
      max(kr.weight, 100, { message: 'Max 100' });
    });

    // Key-result weights must sum to exactly 100.
    validate(p.keyResults, ({ value }) => {
      const list = value();
      if (!list.length) {
        return { kind: 'noKeyResult', message: 'Add at least one key result' };
      }
      const sum = list.reduce((acc, kr) => acc + (Number(kr.weight) || 0), 0);
      if (sum !== 100) {
        return {
          kind: 'weightSum',
          message: `Key-result weights must total 100% (currently ${sum}%)`,
        };
      }
      return null;
    });
  });

  /** Live sum of KR weights for the helper badge. */
  readonly weightTotal = computed(() =>
    this.#model().keyResults.reduce((acc, kr) => acc + (Number(kr.weight) || 0), 0),
  );

  readonly levelOptions: OkrLevel[] = ['Company', 'Department', 'Team', 'Personal'];
  readonly statusOptions: OkrStatus[] = ['Draft', 'Active', 'OnTrack', 'Behind', 'Completed'];
  readonly visibilityOptions: OkrVisibility[] = ['Public', 'Private'];
  readonly quarterOptions = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'];

  readonly departmentOptions = [
    { label: 'Engineering', value: 'dep-eng' },
    { label: 'Sales', value: 'dep-sales' },
    { label: 'Marketing', value: 'dep-mkt' },
    { label: 'Human Resources', value: 'dep-hr' },
    { label: 'Product', value: 'dep-prod' },
    { label: 'Finance', value: 'dep-fin' },
  ];

  ngOnInit(): void {
    this.isEdit.set(this.#route.snapshot.data['mode'] === 'edit');
    const id = this.#route.snapshot.paramMap.get('id');

    this.#commonService.setPageHeaderInfo({
      pageTitle: this.isEdit() ? 'Edit OKR' : 'Create OKR',
      pageDescription: 'Define an objective and its measurable key results',
      pageIcon: 'pi pi-flag',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'OKRs', routerLink: '/app/okr/dashboard' },
      { label: this.isEdit() ? 'Edit OKR' : 'Create OKR' },
    ]);

    if (this.isEdit() && id) {
      this.#loadOkr(id);
    }
  }

  #loadOkr(id: string): void {
    this.isLoading.set(true);
    this.#okrApi
      .getOkr(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.isSucceeded && res.data) {
            this.#editingOkr.set(res.data);
            this.#model.set(okrToForm(res.data));
          } else {
            this.#commonService.showMessage('OKR not found', 'error');
            this.#router.navigateByUrl(resolveOkrOrigin(this.#from));
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.#commonService.showMessage('Failed to load OKR', 'error');
        },
      });
  }

  addKeyResult(): void {
    this.#model.update((m) => ({
      ...m,
      keyResults: [
        ...m.keyResults,
        emptyKeyResult(`kr-new-${m.keyResults.length + 1}-${Date.now()}`),
      ],
    }));
  }

  removeKeyResult(index: number): void {
    this.#model.update((m) => ({
      ...m,
      keyResults: m.keyResults.filter((_, i) => i !== index),
    }));
  }

  async save(): Promise<void> {
    const submitted = await submit(this.f, async () => {
      this.isSaving.set(true);
      const payload = formToOkr(this.#model(), this.#editingOkr() ?? undefined);
      const request$ = this.isEdit()
        ? this.#okrApi.updateOkr({ okr: payload })
        : this.#okrApi.addOkr({ okr: payload });

      const res = await new Promise<{ isSucceeded: boolean; message: string; data?: IOkr }>(
        (resolve) =>
          request$.subscribe({
            next: (r) => resolve(r),
            error: (e: Error) => resolve({ isSucceeded: false, message: e.message }),
          }),
      );

      this.isSaving.set(false);
      this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
      if (res.isSucceeded && res.data) {
        this.#router.navigate(['/app/okr', res.data.id], { queryParams: { from: this.#from } });
      }
      return undefined;
    });

    if (!submitted) {
      this.#commonService.showMessage('Please fix the highlighted fields', 'warn');
    }
  }

  cancel(): void {
    this.#router.navigateByUrl(resolveOkrOrigin(this.#from));
  }
}
