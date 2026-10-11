import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { finalize } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { InstitutionPolicyResolution } from '@shared/interfaces';
import { injectStaffMemberOptions } from '@shared/utilities/staff-member-filter-options';

import { ymd } from '../../date-only';
import { DEFINITIONS_MODULE_CODE } from '../../institution-policy-constants';
import { ResolvePoliciesModel, resolvePoliciesSchema } from './resolve-policies-dialog.schema';

const SOURCE_LABELS: Record<string, string> = {
  APPLICABILITY: 'Applicability',
  MANUAL_ASSIGNMENT: 'Direct assignment',
  EXCEPTION: 'Exception',
};

@Component({
  selector: 'app-resolve-policies-dialog',
  imports: [ButtonModule, TableModule, TagModule, FormDate, FormSelect, TableEmptyMessage],
  templateUrl: './resolve-policies-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResolvePoliciesDialog {
  readonly #institutionPolicyApi = inject(InstitutionPolicyApi);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);

  readonly #staffMembers = injectStaffMemberOptions();

  protected readonly staffMemberOptions = this.#staffMembers.options;
  protected readonly isLoadingStaffMembers = this.#staffMembers.isLoading;
  protected readonly isResolving = signal(false);
  /** `null` until the first run, so the table is not shown reading "no policies" before one. */
  protected readonly resolutions = signal<InstitutionPolicyResolution[] | null>(null);

  protected readonly model = signal<ResolvePoliciesModel>({
    staffMemberId: null,
    effectiveDate: new Date(),
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, resolvePoliciesSchema);
  });

  protected sourceLabel(source: string): string {
    return SOURCE_LABELS[source] ?? source;
  }

  onSubmit() {
    if (this.isResolving()) return;

    submit(this.f, async () => {
      const value = this.model();

      const { ModuleId, OperationId } = this.#featurePageStore.moduleOperationIds(
        [DEFINITIONS_MODULE_CODE],
        'View',
      );

      this.isResolving.set(true);
      this.#institutionPolicyApi
        .resolvePolicies({
          moduleId: ModuleId,
          operationId: OperationId,
          staffMemberId: value.staffMemberId!,
          effectiveDate: ymd(value.effectiveDate)!,
        })
        .pipe(
          finalize(() => this.isResolving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              this.resolutions.set(res.data);
            } else {
              this.resolutions.set(null);
              this.#commonService.showMessage(res.message, 'error');
            }
          },
          error: (err) => {
            this.resolutions.set(null);
            this.#commonService.showMessage(err.message, 'error');
          },
        });
    });
  }

  onClose() {
    this.#dialogRef.close();
  }
}
