import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize, Observable } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import {
  Role,
  InstitutionPolicyApprovalStage,
  InstitutionPolicyApprovalStageResponse,
  InstitutionPolicyLookupOption,
} from '@shared/interfaces';

import { APPROVALS_MODULE_CODE } from '../../institution-policy-constants';
import { ApprovalStageModel, approvalStageSchema } from './approval-stage-dialog.schema';

@Component({
  selector: 'app-approval-stage-dialog',
  imports: [FormActionBar, FormNumber, FormSelect, FormSwitch, FormText],
  templateUrl: './approval-stage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ApprovalStageDialog {
  readonly #institutionPolicyApi = inject(InstitutionPolicyApi);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);

  readonly #stage: InstitutionPolicyApprovalStage | undefined = this.#dialogConfig.data?.stage;

  protected readonly categories: InstitutionPolicyLookupOption[] =
    this.#dialogConfig.data?.categories ?? [];
  protected readonly roles: Role[] = this.#dialogConfig.data?.roles ?? [];
  protected readonly isEditing = this.#stage !== undefined;
  protected readonly isSaving = signal(false);

  protected readonly model = signal<ApprovalStageModel>({
    policyCategoryId: this.#stage?.policyCategoryId ?? null,
    stageName: this.#stage?.stageName ?? '',
    stageOrder: this.#stage?.stageOrder ?? null,
    approverRoleId: this.#stage?.approverRoleId ?? null,
    minimumApprovals: this.#stage?.minimumApprovals ?? 1,
    isMandatory: this.#stage?.isMandatory ?? true,
    isActive: this.#stage?.isActive ?? true,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, approvalStageSchema);
  });

  onSubmit() {
    if (this.isSaving()) return;

    submit(this.f, async () => {
      const value = this.model();
      const { ModuleId, OperationId } = this.#featurePageStore.moduleOperationIds(
        [APPROVALS_MODULE_CODE],
        this.#stage ? 'Update' : 'Add',
      );

      const body = {
        moduleId: ModuleId,
        operationId: OperationId,
        policyCategoryId: value.policyCategoryId,
        stageName: value.stageName.trim(),
        stageOrder: value.stageOrder!,
        approverRoleId: value.approverRoleId!,
        minimumApprovals: value.minimumApprovals!,
        isMandatory: value.isMandatory,
      };

      const request: Observable<InstitutionPolicyApprovalStageResponse> = this.#stage
        ? this.#institutionPolicyApi.updateApprovalStage(this.#stage.id, {
            ...body,
            isActive: value.isActive,
          })
        : this.#institutionPolicyApi.addApprovalStage(body);

      this.isSaving.set(true);
      request
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
