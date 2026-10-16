import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormFile } from '@shared/components/form-inputs/form-file/form-file';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import { InstitutionPolicyLookupOption } from '@shared/interfaces';

import { DEFINITIONS_MODULE_CODE } from '../../institution-policy-constants';
import { PolicyDocumentModel, policyDocumentSchema } from './policy-document-dialog.schema';

/** The API accepts PDF, DOC and DOCX between 1 byte and 10 MB. */
const ACCEPTED_TYPES =
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_FILE_SIZE = 10_000_000;

@Component({
  selector: 'app-policy-document-dialog',
  imports: [FormActionBar, FormFile, FormSelect, FormSwitch, FormText],
  templateUrl: './policy-document-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyDocumentDialog {
  readonly #institutionPolicyApi = inject(InstitutionPolicyApi);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);

  readonly #versionId: number = this.#dialogConfig.data?.versionId;

  protected readonly documentTypes: InstitutionPolicyLookupOption[] =
    this.#dialogConfig.data?.documentTypes ?? [];
  protected readonly acceptedTypes = ACCEPTED_TYPES;
  protected readonly maxFileSize = MAX_FILE_SIZE;
  protected readonly isSaving = signal(false);

  protected readonly model = signal<PolicyDocumentModel>({
    file: null,
    policyDocumentTypeId: null,
    documentTitle: '',
    languageCode: 'en',
    isStaffMemberVisible: true,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, policyDocumentSchema);
  });

  onSubmit() {
    if (this.isSaving()) return;

    submit(this.f, async () => {
      const value = this.model();
      const file = Array.isArray(value.file) ? value.file[0] : value.file;

      if (!file) {
        this.#commonService.showMessage('Choose a document to upload.', 'error');
        return;
      }

      const { ModuleId, OperationId } = this.#featurePageStore.moduleOperationIds(
        [DEFINITIONS_MODULE_CODE],
        'Upload',
      );

      const body = new FormData();
      if (ModuleId !== undefined) body.append('moduleId', String(ModuleId));
      if (OperationId !== undefined) body.append('operationId', String(OperationId));
      body.append('policyVersionId', String(this.#versionId));
      body.append('policyDocumentTypeId', String(value.policyDocumentTypeId));
      body.append('documentTitle', value.documentTitle.trim());
      body.append('languageCode', value.languageCode.trim());
      body.append('isStaffMemberVisible', String(value.isStaffMemberVisible));
      body.append('file', file, file.name);

      this.isSaving.set(true);
      this.#institutionPolicyApi
        .uploadDocument(body)
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
