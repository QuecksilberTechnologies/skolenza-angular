import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize, from, Observable, switchMap } from 'rxjs';

import { Common, OperationsMasterApi } from '@core/services';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SkeletonToggle } from '@shared/components/form-skeleton/form-skeleton-toggle';
import { IconHelpLink } from '@shared/components/icon-help-link/icon-help-link';
import {
  CreateOperationReq,
  OPERATION_TYPES,
  OperationMutationRes,
  OperationRow,
  OperationTypeOption,
  UpdateOperationReq,
} from '@shared/interfaces';

export interface OperationFormData {
  operation?: OperationRow;
}

@Component({
  selector: 'app-operation-form',
  imports: [
    FormField,
    IconHelpLink,
    SkeletonField,
    SkeletonToggle,
    AutoFocusModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './operation-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class OperationForm {
  readonly #operationsApi = inject(OperationsMasterApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);

  protected readonly data: OperationFormData = this.#dialogConfig.data ?? {};
  protected readonly operationId = this.data.operation?.id;

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);

  /** Errors stay hidden until a field is actually edited, or the form is submitted. */
  protected readonly submitAttempted = signal(false);

  /**
   * `operationType` is a backend-defined int; `OPERATION_TYPES` only labels the ones we know. A row
   * carrying an unknown value gets its own option so editing it does not silently blank the field.
   */
  protected readonly typeOptions = signal<OperationTypeOption[]>(OPERATION_TYPES);

  protected readonly model = signal({
    operationName: '',
    operationType: null as number | null,
    iconImage: '',
    remark: '',
    isActive: true,
  });

  protected readonly f = form(this.model, (p) => {
    required(p.operationName, { message: 'Operation name is required' });
    maxLength(p.operationName, 100, { message: 'Operation name cannot exceed 100 characters' });
    required(p.operationType, { message: 'Operation type is required' });
    maxLength(p.iconImage, 255, { message: 'Icon cannot exceed 255 characters' });
    // `remark` is required by both `CreateOperationRequestDTO` and `UpdateOperationRequestDTO`.
    required(p.remark, { message: 'Remark is required' });
    maxLength(p.remark, 200, { message: 'Remark cannot exceed 200 characters' });
  });

  constructor() {
    if (this.operationId) {
      this.hydrate(this.operationId);
    }
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  private hydrate(id: number): void {
    this.isLoading.set(true);

    this.#operationsApi
      .getOperation(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const row = res.isSucceeded ? res.data : null;
          if (!row) {
            this.#commonService.showMessage(res.message, 'error');
            return;
          }
          this.ensureTypeOption(row.operationType);
          this.model.set({
            operationName: row.operationName ?? '',
            operationType: row.operationType ?? null,
            iconImage: row.iconImage ?? '',
            remark: row.remark ?? '',
            isActive: row.isActive,
          });
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  private ensureTypeOption(operationType: number | null | undefined): void {
    if (operationType == null) {
      return;
    }
    if (this.typeOptions().some((type) => type.value === operationType)) {
      return;
    }
    this.typeOptions.update((types) => [
      ...types,
      { label: `#${operationType}`, value: operationType },
    ]);
  }

  /** Keeps the model in step with the hand-bound remark textarea. */
  onRemarkInput(event: Event): void {
    const remark = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, remark }));
    // The hand-bound textarea bypasses `FormField`, which is what normally flips these.
    this.f.remark().markAsDirty();
    this.f.remark().markAsTouched();
  }

  onSubmit() {
    // Enter submits natively, bypassing the disabled Save button.
    if (this.isSaving()) {
      return;
    }

    this.submitAttempted.set(true);

    submit(this.f, async () => {
      const value = this.model();

      this.isSaving.set(true);

      // Both DTOs require the acting product owner, which only the login payload carries.
      from(this.#commonService.getLoginInfo())
        .pipe(
          switchMap((loginInfo) => {
            const sessionUser = loginInfo?.user;
            const base: CreateOperationReq = {
              productOwnerId: Number(sessionUser?.staffMemberId ?? 0),
              productOwnerRoleId: sessionUser?.primaryRole?.roleId ?? 0,
              operationName: value.operationName.trim(),
              // `required` has already ruled out null; the fallback only narrows the type.
              operationType: value.operationType ?? 0,
              remark: value.remark.trim(),
              isActive: value.isActive,
              iconImage: value.iconImage.trim() || null,
            };

            const request$: Observable<OperationMutationRes> = this.operationId
              ? this.#operationsApi.updateOperation({
                  ...base,
                  id: this.operationId,
                } satisfies UpdateOperationReq)
              : this.#operationsApi.addOperation(base);

            return request$;
          }),
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#dialogRef.close(true);
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
