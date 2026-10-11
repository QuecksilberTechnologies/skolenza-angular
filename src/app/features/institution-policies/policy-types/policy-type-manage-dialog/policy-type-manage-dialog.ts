import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, submit, validateStandardSchema } from '@angular/forms/signals';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { TrimInput } from '@shared/directives';
import {
  AddInstitutionPolicyTypeRequest,
  InstitutionPolicyLookupOption,
  InstitutionPolicyType,
  InstitutionPolicyTypeResponse,
  UpdateInstitutionPolicyTypeRequest,
} from '@shared/interfaces';

import { InstitutionPolicyTypeModel, institutionPolicyTypeSchema } from './policy-type-manage-dialog.schema';

/** The only leaf module this dialog resolves `moduleId`/`operationId` against. */
const MODULE_CODE = 'INSTITUTION_POLICY_TYPES';

@Component({
  selector: 'app-policy-type-manage-dialog',
  imports: [
    FormField,
    TrimInput,
    AutoFocusModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './policy-type-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyTypeManageDialog {
  readonly #institutionPolicyApi = inject(InstitutionPolicyApi);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);

  protected readonly policyType: InstitutionPolicyType | undefined =
    this.#dynamicDialogConfig.data?.policyType;
  protected readonly categories: InstitutionPolicyLookupOption[] =
    this.#dynamicDialogConfig.data?.categories ?? [];
  protected readonly isSaving = signal(false);

  protected readonly model = signal<InstitutionPolicyTypeModel>({
    policyTypeCode: this.policyType?.code ?? '',
    policyName: this.policyType?.name ?? '',
    description: this.policyType?.description ?? '',
    policyCategoryId: this.policyType?.categoryId ?? null,
    defaultCurrencyCode: this.policyType?.currencyCode ?? 'INR',
    isActive: this.policyType?.isActive ?? true,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, institutionPolicyTypeSchema);
  });

  onDescriptionInput(event: Event): void {
    const description = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, description }));
  }

  onSubmit() {
    if (this.isSaving()) return;

    submit(this.f, async () => {
      const value = this.model();
      const isEdit = !!this.policyType?.id;
      const { ModuleId, OperationId } = this.#featurePageStore.moduleOperationIds(
        [MODULE_CODE],
        isEdit ? 'Update' : 'Add',
      );

      const request$ = isEdit
        ? this.#institutionPolicyApi.updatePolicyType(this.policyType!.id, {
            moduleId: ModuleId,
            operationId: OperationId,
            policyTypeCode: value.policyTypeCode.trim(),
            policyName: value.policyName.trim(),
            description: value.description?.trim(),
            policyCategoryId: value.policyCategoryId!,
            defaultCurrencyCode: value.defaultCurrencyCode,
            isActive: value.isActive,
          } satisfies UpdateInstitutionPolicyTypeRequest)
        : this.#institutionPolicyApi.addPolicyType({
            moduleId: ModuleId,
            operationId: OperationId,
            policyTypeCode: value.policyTypeCode.trim(),
            policyName: value.policyName.trim(),
            description: value.description?.trim(),
            policyCategoryId: value.policyCategoryId!,
            defaultCurrencyCode: value.defaultCurrencyCode,
          } satisfies AddInstitutionPolicyTypeRequest);

      this.isSaving.set(true);
      request$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res: InstitutionPolicyTypeResponse) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) this.#dialogRef.close(true);
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}

