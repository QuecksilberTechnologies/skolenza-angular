import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormMultiSelect } from '@shared/components/form-inputs/form-multiselect/form-multiselect';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { injectStaffMemberOptions } from '@shared/utilities/staffMember-filter-options';

import { ymd } from '../../date-only';
import { ASSIGNMENTS_MODULE_CODE } from '../../institution-policy-constants';
import { AssignPolicyModel, assignPolicySchema } from './assign-policy-dialog.schema';

@Component({
  selector: 'app-assign-policy-dialog',
  imports: [FormActionBar, FormDate, FormMultiSelect, FormSwitch],
  templateUrl: './assign-policy-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AssignPolicyDialog {
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

  protected readonly model = signal<AssignPolicyModel>({
    staffMemberIds: [],
    effectiveFrom: null,
    effectiveTo: null,
    isMandatory: true,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, assignPolicySchema);
  });

  onSubmit() {
    if (this.isSaving()) return;

    submit(this.f, async () => {
      const value = this.model();
      const { ModuleId, OperationId } = this.#featurePageStore.moduleOperationIds(
        [ASSIGNMENTS_MODULE_CODE],
        'Assign',
      );

      this.isSaving.set(true);
      this.#institutionPolicyApi
        .assignPolicy({
          moduleId: ModuleId,
          operationId: OperationId,
          policyVersionId: this.#versionId,
          staffMemberIds: value.staffMemberIds,
          effectiveFrom: ymd(value.effectiveFrom)!,
          effectiveTo: ymd(value.effectiveTo),
          isMandatory: value.isMandatory,
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
