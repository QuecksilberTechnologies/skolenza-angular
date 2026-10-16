import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';
import { injectStaffMemberOptions } from '@shared/utilities/staffMember-filter-options';

import { ymd } from '../../date-only';
import { EXCEPTIONS_MODULE_CODE } from '../policy-version-workspace.store';
import { PolicyExceptionModel, policyExceptionSchema } from './policy-exception-dialog.schema';

@Component({
  selector: 'app-policy-exception-dialog',
  imports: [FormActionBar, FormDate, FormNumber, FormSelect, FormTextarea],
  templateUrl: './policy-exception-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyExceptionDialog {
  readonly #institutionPolicyApi = inject(InstitutionPolicyApi);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);

  readonly #versionId: number = this.#dialogConfig.data?.versionId;
  readonly #staffMembers = injectStaffMemberOptions();

  protected readonly staffMemberOptions = this.#staffMembers.options;
  protected readonly isLoadingStaffMembers = this.#staffMembers.isLoading;
  protected readonly isSaving = signal(false);

  protected readonly model = signal<PolicyExceptionModel>({
    staffMemberId: null,
    exceptionType: null,
    overrideConfiguration: '',
    reason: '',
    effectiveFrom: null,
    effectiveTo: null,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, policyExceptionSchema);
  });

  onSubmit() {
    if (this.isSaving()) return;

    submit(this.f, async () => {
      const value = this.model();
      const { ModuleId, OperationId } = this.#featurePageStore.moduleOperationIds(
        [EXCEPTIONS_MODULE_CODE],
        'Add',
      );

      this.isSaving.set(true);
      this.#institutionPolicyApi
        .createException({
          moduleId: ModuleId,
          operationId: OperationId,
          policyVersionId: this.#versionId,
          staffMemberId: value.staffMemberId!,
          exceptionType: value.exceptionType!,
          overrideConfiguration: value.overrideConfiguration.trim(),
          reason: value.reason.trim(),
          effectiveFrom: ymd(value.effectiveFrom)!,
          effectiveTo: ymd(value.effectiveTo),
        })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
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
