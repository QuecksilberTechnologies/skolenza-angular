import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';

import { ymd } from '../../date-only';
import { DEFINITIONS_MODULE_CODE } from '../../institution-policy-constants';
import { CloneVersionModel, cloneVersionSchema } from './clone-version-dialog.schema';

@Component({
  selector: 'app-clone-version-dialog',
  imports: [FormActionBar, FormDate, FormTextarea],
  templateUrl: './clone-version-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CloneVersionDialog {
  readonly #institutionPolicyApi = inject(InstitutionPolicyApi);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);

  readonly #policyId: number = this.#dialogConfig.data?.policyId;
  readonly #versionId: number = this.#dialogConfig.data?.versionId;

  protected readonly isSaving = signal(false);

  protected readonly model = signal<CloneVersionModel>({
    effectiveFrom: null,
    changeSummary: '',
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, cloneVersionSchema);
  });

  onSubmit() {
    if (this.isSaving()) return;

    submit(this.f, async () => {
      const value = this.model();
      const { ModuleId, OperationId } = this.#featurePageStore.moduleOperationIds(
        [DEFINITIONS_MODULE_CODE],
        'Add',
      );

      this.isSaving.set(true);
      this.#institutionPolicyApi
        .clonePolicyVersion(this.#policyId, {
          moduleId: ModuleId,
          operationId: OperationId,
          sourceVersionId: this.#versionId,
          effectiveFrom: ymd(value.effectiveFrom)!,
          changeSummary: value.changeSummary.trim(),
        })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            // The clone is a new draft version, so the caller navigates to it rather than staying
            // on the version this one was cloned from.
            if (res.isSucceeded) this.#dialogRef.close(res.data?.versionId ?? true);
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
