import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { FormCheckbox, FormText, FormTextarea } from '@shared/components';
import {
  SaveStaffProfessionalMaster,
  StaffProfessionalMaster,
  StaffProfessionalMasterType,
} from '@shared/interfaces';

import {
  ProfessionalMasterFormModel,
  professionalMasterSchema,
} from './professional-master-dialog.schema';

export interface ProfessionalMasterDialogData {
  type: StaffProfessionalMasterType;
  master?: StaffProfessionalMaster;
}

/** Flags the form does not edit; a new record starts from these, an edit keeps its own. */
const NEW_MASTER: SaveStaffProfessionalMaster = {
  code: '',
  name: '',
  description: '',
  displayOrder: 10,
  isActive: true,
  requiresCertification: false,
  certificationValidityRequired: false,
  defaultFrequency: '',
  requiresEvidence: false,
};

/** Example values shown as input placeholders, per master type. */
const PLACEHOLDERS: Record<
  StaffProfessionalMasterType,
  { code: string; name: string; description: string }
> = {
  [StaffProfessionalMasterType.JobFamily]: {
    code: 'e.g. TEACH',
    name: 'e.g. Teaching',
    description: 'Describe the roles this job family covers',
  },
  [StaffProfessionalMasterType.Capability]: {
    code: 'e.g. FIRST-AID',
    name: 'e.g. First Aid',
    description: 'Describe what this capability qualifies staff to do',
  },
  [StaffProfessionalMasterType.DutyDefinition]: {
    code: 'e.g. BUS-DUTY',
    name: 'e.g. Bus Duty',
    description: 'Describe what this duty involves',
  },
};

/** Add or edit a Job Family, Capability or Duty. Closes with `true` after a successful save. */
@Component({
  selector: 'app-professional-master-dialog',
  imports: [ButtonModule, FormCheckbox, FormText, FormTextarea],
  templateUrl: './professional-master-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalMasterDialog {
  readonly #api = inject(StaffProfessionalStructureApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #data: ProfessionalMasterDialogData = inject(DynamicDialogConfig).data;

  protected readonly isDuty = this.#data.type === StaffProfessionalMasterType.DutyDefinition;
  protected readonly placeholders = PLACEHOLDERS[this.#data.type];
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<ProfessionalMasterFormModel>({
    code: this.#data.master?.code ?? '',
    name: this.#data.master?.name ?? '',
    description: this.#data.master?.description ?? '',
    defaultFrequency: this.#data.master?.defaultFrequency ?? '',
    isActive: this.#data.master?.isActive ?? true,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, professionalMasterSchema);
  });

  protected save(): void {
    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      const value = this.model();
      const body: SaveStaffProfessionalMaster = {
        ...(this.#data.master ?? NEW_MASTER),
        code: value.code.trim(),
        name: value.name.trim(),
        description: value.description.trim(),
        defaultFrequency: value.defaultFrequency.trim(),
        isActive: value.isActive,
      };
      this.isSaving.set(true);
      this.#api
        .saveMaster(this.#data.type, body)
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (response) => {
            this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
            if (response.isSucceeded) this.#dialogRef.close(true);
          },
          error: (error) => this.#common.showMessage(error.message, 'error'),
        });
    });
  }

  protected cancel(): void {
    this.#dialogRef.close();
  }
}
